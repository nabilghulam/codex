mod compact;
mod regular;
mod review;
mod subagent;

use std::sync::Arc;

use async_trait::async_trait;
use tracing::trace;

use crate::codex::Session;
use crate::codex::TurnContext;
use crate::protocol::Event;
use crate::protocol::EventMsg;
use crate::protocol::InputItem;
use crate::protocol::TaskCompleteEvent;
use crate::protocol::TurnAbortReason;
use crate::protocol::TurnAbortedEvent;
use crate::state::ActiveTurn;
use crate::state::RunningTask;
use crate::state::TaskKind;

pub(crate) use compact::CompactTask;
pub(crate) use regular::RegularTask;
pub(crate) use review::ReviewTask;
pub(crate) use subagent::SubagentTask;

/// Thin wrapper that exposes the parts of [`Session`] task runners need.
#[derive(Clone)]
pub(crate) struct SessionTaskContext {
    session: Arc<Session>,
}

impl SessionTaskContext {
    pub(crate) fn new(session: Arc<Session>) -> Self {
        Self { session }
    }

    pub(crate) fn clone_session(&self) -> Arc<Session> {
        Arc::clone(&self.session)
    }
}

#[async_trait]
pub(crate) trait SessionTask: Send + Sync + 'static {
    fn kind(&self) -> TaskKind;

    async fn run(
        self: Arc<Self>,
        session: Arc<SessionTaskContext>,
        ctx: Arc<TurnContext>,
        sub_id: String,
        input: Vec<InputItem>,
    ) -> Option<String>;

    async fn abort(&self, session: Arc<SessionTaskContext>, sub_id: &str) {
        let _ = (session, sub_id);
    }
}

impl Session {
    pub async fn spawn_task<T: SessionTask>(
        self: &Arc<Self>,
        turn_context: Arc<TurnContext>,
        sub_id: String,
        input: Vec<InputItem>,
        task: T,
    ) {
        self.abort_all_tasks(TurnAbortReason::Replaced).await;

        let task: Arc<dyn SessionTask> = Arc::new(task);
        let task_kind = task.kind();

        let handle = {
            let session_ctx = Arc::new(SessionTaskContext::new(Arc::clone(self)));
            let ctx = Arc::clone(&turn_context);
            let task_for_run = Arc::clone(&task);
            let sub_clone = sub_id.clone();
            tokio::spawn(async move {
                let last_agent_message = task_for_run
                    .run(Arc::clone(&session_ctx), ctx, sub_clone.clone(), input)
                    .await;
                // Emit completion uniformly from spawn site so all tasks share the same lifecycle.
                let sess = session_ctx.clone_session();
                sess.on_task_finished(sub_clone, last_agent_message).await;
            })
            .abort_handle()
        };

        let running_task = RunningTask {
            handle,
            kind: task_kind,
            task,
        };
        self.register_new_active_task(sub_id, running_task).await;
    }

    pub async fn abort_all_tasks(self: &Arc<Self>, reason: TurnAbortReason) {
        for (sub_id, task) in self.take_all_running_tasks().await {
            self.handle_task_abort(sub_id, task, reason.clone()).await;
        }
    }

    pub async fn on_task_finished(
        self: &Arc<Self>,
        sub_id: String,
        last_agent_message: Option<String>,
    ) {
        let (finished_kind, subagent_name_opt) = {
            let mut active = self.active_turn.lock().await;
            if let Some(at) = active.as_mut() {
                let kind = at.remove_task(&sub_id);
                // Extract subagent name while holding the turn_state lock only.
                let subagent_name_opt = {
                    let mut ts = at.turn_state.lock().await;
                    ts.take_subagent_name(&sub_id)
                };
                let should_clear = at.tasks.is_empty();
                if should_clear {
                    *active = None;
                }
                (kind, subagent_name_opt)
            } else {
                (None, None)
            }
        };

        // For subagent tasks, emit a SubagentStopped lifecycle event with name.
        if let Some(TaskKind::Subagent) = finished_kind {
            let event = Event {
                id: sub_id.clone(),
                msg: EventMsg::SubagentStopped(codex_protocol::protocol::SubagentStoppedEvent {
                    name: subagent_name_opt.unwrap_or_else(|| "subagent".to_string()),
                    success: true,
                }),
            };
            self.send_event(event).await;
        }
        let event = Event {
            id: sub_id,
            msg: EventMsg::TaskComplete(TaskCompleteEvent { last_agent_message }),
        };
        self.send_event(event).await;
    }

    async fn register_new_active_task(&self, sub_id: String, task: RunningTask) {
        let mut active = self.active_turn.lock().await;
        let mut turn = ActiveTurn::default();
        turn.add_task(sub_id, task);
        *active = Some(turn);
    }

    async fn take_all_running_tasks(&self) -> Vec<(String, RunningTask)> {
        let mut active = self.active_turn.lock().await;
        match active.take() {
            Some(mut at) => {
                at.clear_pending().await;
                let tasks = at.drain_tasks();
                tasks.into_iter().collect()
            }
            None => Vec::new(),
        }
    }

    async fn handle_task_abort(
        self: &Arc<Self>,
        sub_id: String,
        task: RunningTask,
        reason: TurnAbortReason,
    ) {
        if task.handle.is_finished() {
            return;
        }

        trace!(task_kind = ?task.kind, sub_id, "aborting running task");
        let session_task = task.task;
        let handle = task.handle;
        handle.abort();
        let session_ctx = Arc::new(SessionTaskContext::new(Arc::clone(self)));
        session_task.abort(session_ctx, &sub_id).await;

        let event = Event {
            id: sub_id.clone(),
            msg: EventMsg::TurnAborted(TurnAbortedEvent { reason }),
        };
        self.send_event(event).await;
    }
}

#[cfg(test)]
mod tests {}
