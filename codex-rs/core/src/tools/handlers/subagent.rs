use std::collections::HashSet;
use std::sync::Arc;

use async_trait::async_trait;
use serde::Deserialize;

use crate::codex::spawn_subagent_thread;
use crate::config::SubagentDef;
use crate::function_tool::FunctionCallError;
use crate::tools::context::ToolInvocation;
use crate::tools::context::ToolOutput;
use crate::tools::context::ToolPayload;
use crate::tools::registry::ToolHandler;
use crate::tools::registry::ToolKind;

#[derive(Debug, Default)]
pub struct SubagentHandler;

#[async_trait]
impl ToolHandler for SubagentHandler {
    fn kind(&self) -> ToolKind {
        ToolKind::Function
    }

    async fn handle(&self, invocation: ToolInvocation) -> Result<ToolOutput, FunctionCallError> {
        // Expect standard function-call payload
        let ToolPayload::Function { arguments } = invocation.payload.clone() else {
            return Err(FunctionCallError::Fatal(
                "delegate_to_subagent requires function payload".to_string(),
            ));
        };

        #[derive(Deserialize)]
        struct Args {
            name: String,
            prompt: String,
        }
        let args: Args = serde_json::from_str(&arguments).map_err(|e| {
            FunctionCallError::RespondToModel(format!(
                "invalid arguments for delegate_to_subagent: {e}"
            ))
        })?;

        // Lookup subagent by name with precedence already merged into Config.
        let config = invocation.turn.client.get_config_arc();
        let found: Option<SubagentDef> = config
            .subagents
            .iter()
            .find(|a| a.name == args.name)
            .cloned();

        let Some(agent) = found else {
            return Err(FunctionCallError::RespondToModel(format!(
                "unknown subagent `{}`",
                args.name
            )));
        };

        // Build allowlist if tools specified.
        let allowed_tools: Option<HashSet<String>> = agent.tools.as_ref().map(|list| {
            list.iter().map(|s| map_tool_alias(s)).collect()
        });

        // Delegate: spawn child turn with isolated context.
        let sess = invocation.session;
        let parent_tc = invocation.turn;
        let cfg_arc = config;
        let name = agent.name.clone();
        let prompt = agent.prompt.clone();
        let override_model = agent.model.clone();
        spawn_subagent_thread(
            sess.clone(),
            cfg_arc,
            parent_tc.clone(),
            name,
            args.prompt.clone(),
            override_model,
            allowed_tools,
        )
        .await;

        Ok(ToolOutput::Function {
            content: "delegated".to_string(),
            success: Some(true),
        })
    }
}

fn map_tool_alias(input: &str) -> String {
    // Accept friendly Claude-esque names and exact internal names (and MCP FQNs).
    match input.trim().to_lowercase().as_str() {
        "bash" | "shell" => "unified_exec".to_string(),
        "grep" => "grep_files".to_string(),
        "read" => "read_file".to_string(),
        "glob" | "list" => "list_dir".to_string(),
        other => other.to_string(),
    }
}

