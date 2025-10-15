"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AuthSession, maskApiKey } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface WorkspaceProps {
  session: AuthSession;
}

type WorkspaceEvent =
  | { id: string; timestamp: number; kind: "user"; message: string }
  | { id: string; timestamp: number; kind: "agent"; message: string }
  | { id: string; timestamp: number; kind: "plan"; steps: string[] }
  | { id: string; timestamp: number; kind: "diff"; file: string; diff: string }
  | { id: string; timestamp: number; kind: "command"; command: string; status: "running" | "success" | "error"; output?: string }
  | { id: string; timestamp: number; kind: "summary"; headline: string; bullets: string[] };

type CommandEvent = Extract<WorkspaceEvent, { kind: "command" }>;

export function Workspace({ session }: WorkspaceProps) {
  const [composerValue, setComposerValue] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [events, setEvents] = React.useState<WorkspaceEvent[]>(() => createInitialEvents(session));
  const logRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setEvents(createInitialEvents(session));
    setComposerValue("");
    setIsProcessing(false);
  }, [session]);

  React.useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const appendEvent = React.useCallback((event: Omit<WorkspaceEvent, "id" | "timestamp">) => {
    const entry: WorkspaceEvent = {
      ...event,
      id: makeRandomId(),
      timestamp: Date.now()
    };
    setEvents((current) => [...current, entry]);
    return entry.id;
  }, []);

  const updateEvent = React.useCallback((id: string, updater: (event: WorkspaceEvent) => WorkspaceEvent) => {
    setEvents((current) => current.map((event) => (event.id === id ? updater(event) : event)));
  }, []);

  const processPrompt = React.useCallback(
    async (prompt: string) => {
      setIsProcessing(true);
      try {
        appendEvent({ kind: "user", message: prompt });
        await delay(220);
        appendEvent({ kind: "agent", message: "Analyzing repository context and recent history…" });

        const plan = buildPlan(prompt, session);
        await delay(480);
        appendEvent({ kind: "plan", steps: plan });

        const file = pickFileCandidate(prompt);
        await delay(320);
        appendEvent({ kind: "agent", message: `Synthesizing edits for ${file}…` });

        const diff = generateDiff(file, prompt);
        await delay(520);
        appendEvent({ kind: "diff", file, diff });

        const command = determineCommand(prompt);
        const commandId = appendEvent({ kind: "command", command, status: "running" });
        await delay(640);
        updateEvent(commandId, (event) => {
          if (event.kind !== "command") {
            return event;
          }
          return {
            ...event,
            status: "success",
            output: `${command} completed with exit code 0`
          };
        });

        await delay(280);
        appendEvent({ kind: "agent", message: "Proposed changes are staged locally. Review the diff before approving." });
        appendEvent({
          kind: "summary",
          headline: "Suggested next actions",
          bullets: buildSummaryBullets(prompt, command)
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [appendEvent, session, updateEvent]
  );

  const attemptSubmit = React.useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed || isProcessing) {
      return;
    }
    setComposerValue("");
    await processPrompt(trimmed);
  }, [composerValue, isProcessing, processPrompt]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await attemptSubmit();
    },
    [attemptSubmit]
  );

  const handleComposerKeyDown = React.useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        event.preventDefault();
        await attemptSubmit();
      }
    },
    [attemptSubmit]
  );

  const commandEvents = React.useMemo(() => events.filter(isCommandEvent), [events]);
  const composerPlaceholder = session.method === "subscription"
    ? "Ask Codex to work on your repo using the linked subscription"
    : "Describe what Codex should do with your API key session";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Interactive run</CardTitle>
          <CardDescription>Send prompts and follow the Codex CLI workflow without leaving the browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-muted/30 p-4">
            {events.map((event) => (
              <WorkspaceEventItem key={event.id} event={event} />
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium text-foreground">
                Prompt Codex
              </label>
              <Textarea
                id="prompt"
                value={composerValue}
                onChange={(event) => setComposerValue(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={composerPlaceholder}
                disabled={isProcessing}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Use ⌘ + Enter or Ctrl + Enter to send. Shift + Enter adds a new line.</p>
              <Button type="submit" disabled={isProcessing || !composerValue.trim()}>
                {isProcessing ? "Running…" : "Send to Codex"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Active authentication details reflected in this run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="font-medium capitalize">{session.method === "subscription" ? "Subscription" : "API key"}</p>
            </div>
            {session.method === "subscription" ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Account email</p>
                <p className="font-medium">{session.email}</p>
                <p className="text-xs text-muted-foreground">Verified {new Date(session.verifiedAt).toLocaleString()}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">API key</p>
                <p className="font-mono text-sm">{maskApiKey(session.apiKey)}</p>
                <p className="text-xs text-muted-foreground">Captured {new Date(session.capturedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Environment</p>
              <p className="text-sm">Local sandbox (network disabled) • Bun 1.3 runtime</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Command queue</CardTitle>
            <CardDescription>Shell commands Codex scheduled for this run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {commandEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commands yet. Submit a prompt to see Codex plan work.</p>
            ) : (
              commandEvents.map((command) => <CommandItem key={command.id} command={command} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkspaceEventItem({ event }: { event: WorkspaceEvent }) {
  switch (event.kind) {
    case "user":
      return (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm shadow-sm">
          <EventHeader label="You" timestamp={event.timestamp} tone="user" />
          <p className="whitespace-pre-wrap text-foreground">{event.message}</p>
        </div>
      );
    case "agent":
      return (
        <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
          <EventHeader label="Codex" timestamp={event.timestamp} tone="agent" />
          <p className="whitespace-pre-wrap text-muted-foreground">{event.message}</p>
        </div>
      );
    case "plan":
      return (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm shadow-sm">
          <EventHeader label="Plan" timestamp={event.timestamp} tone="plan" />
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            {event.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      );
    case "diff":
      return (
        <div className="rounded-lg border bg-black text-sm text-green-300 shadow-sm">
          <EventHeader label={`Diff · ${event.file}`} timestamp={event.timestamp} tone="diff" />
          <pre className="mt-2 overflow-x-auto whitespace-pre text-xs leading-relaxed text-green-300">
            {event.diff}
          </pre>
        </div>
      );
    case "command":
      return <CommandEventPreview event={event} />;
    case "summary":
      return (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm shadow-sm">
          <EventHeader label={event.headline} timestamp={event.timestamp} tone="summary" />
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {event.bullets.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      );
  }
}

function EventHeader({
  label,
  timestamp,
  tone
}: {
  label: string;
  timestamp: number;
  tone: "user" | "agent" | "plan" | "diff" | "summary" | "command";
}) {
  const timeLabel = new Date(timestamp).toLocaleTimeString();
  const color =
    tone === "user"
      ? "text-primary"
      : tone === "plan"
        ? "text-blue-500 dark:text-blue-300"
        : tone === "diff"
          ? "text-emerald-400"
          : tone === "summary"
            ? "text-amber-500 dark:text-amber-300"
            : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={cn("font-semibold", color)}>{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{timeLabel}</span>
    </div>
  );
}

function CommandItem({ command }: { command: CommandEvent }) {
  const statusColor =
    command.status === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : command.status === "running"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(command.timestamp).toLocaleTimeString()}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium", statusColor)}>
          {command.status === "running" ? "Running" : command.status === "success" ? "Completed" : "Failed"}
        </span>
      </div>
      <p className="font-mono text-sm text-foreground">{command.command}</p>
      {command.output ? <p className="text-xs text-muted-foreground">{command.output}</p> : null}
    </div>
  );
}

function CommandEventPreview({ event }: { event: CommandEvent }) {
  const statusColor =
    event.status === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : event.status === "running"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
        : "bg-red-500/10 text-red-600 dark:text-red-300";
  return (
    <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <EventHeader label="Command" timestamp={event.timestamp} tone="command" />
      <div className="mt-2 space-y-2">
        <p className="font-mono text-sm text-foreground">{event.command}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={cn("border-transparent", statusColor)}>
            {event.status === "running" ? "Running" : event.status === "success" ? "Completed" : "Failed"}
          </Badge>
          {event.output ? <span>{event.output}</span> : <span>Queued by Codex</span>}
        </div>
      </div>
    </div>
  );
}

function isCommandEvent(event: WorkspaceEvent): event is CommandEvent {
  return event.kind === "command";
}

function createInitialEvents(session: AuthSession): WorkspaceEvent[] {
  const now = Date.now();
  const greeting =
    session.method === "subscription"
      ? `Subscription session confirmed for ${session.email}.`
      : `API key session ready (${maskApiKey(session.apiKey)}).`;
  return [
    {
      id: makeRandomId(),
      timestamp: now,
      kind: "agent",
      message: greeting
    },
    {
      id: makeRandomId(),
      timestamp: now + 10,
      kind: "agent",
      message: "What can I help you build? Describe the change and I will draft a plan."
    }
  ];
}

function pickFileCandidate(prompt: string) {
  const matches = prompt.match(/(?:[\w./-]+\.[\w]+)/g) ?? [];
  const sanitized = matches
    .map((item) => item.replace(/^\.{1,2}\/?/, ""))
    .filter((item, index, array) => array.indexOf(item) === index);
  return sanitized[0] ?? "src/codex-agent.ts";
}

function buildPlan(prompt: string, session: AuthSession) {
  const summary = summarizePrompt(prompt);
  const file = pickFileCandidate(prompt);
  const steps = [
    `Review repository state and recall previous runs for context.`,
    `Draft changes in ${file} aligned with “${summary}”.`,
    session.method === "subscription"
      ? "Stage the diff locally and prepare the approval step."
      : "Store artifacts locally since API key auth cannot reuse hosted sessions."
  ];
  return steps;
}

function generateDiff(file: string, prompt: string) {
  const summary = summarizePrompt(prompt);
  const header = `diff --git a/${file} b/${file}`;
  const body = [`--- a/${file}`, `+++ b/${file}`, "@@"];
  const extension = file.split(".").pop()?.toLowerCase();
  const snippet = renderSnippet(extension, summary);
  return [header, ...body, ...snippet].join("\n");
}

function renderSnippet(extension: string | undefined, summary: string) {
  switch (extension) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return [
        "+export function runCodexTask() {",
        `+  // ${summary}`,
        "+  // TODO: call Codex APIs here",
        "+}",
        ""
      ];
    case "py":
      return [
        "+def run_codex_task():",
        `+    """${summary}"""`,
        "+    pass",
        ""
      ];
    case "rs":
      return [
        "+pub fn run_codex_task() {",
        `+    // ${summary}`,
        "+}",
        ""
      ];
    case "md":
      return [
        "+## Update",
        `+${summary}`,
        ""
      ];
    default:
      return [
        `+// ${summary}`,
        ""
      ];
  }
}

function determineCommand(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (/(test|assert|spec)/.test(normalized)) {
    return "bun test";
  }
  if (/(build|bundle)/.test(normalized)) {
    return "bun run build";
  }
  if (/(lint|format)/.test(normalized)) {
    return "bun run lint";
  }
  return "bun run check";
}

function buildSummaryBullets(prompt: string, command: string) {
  const summary = summarizePrompt(prompt);
  return [
    `Review the diff to ensure it matches “${summary}”.`,
    `Run ${command} locally if you want to double-check the sandbox results.`,
    "Approve in the CLI to apply the staged changes."
  ];
}

function summarizePrompt(prompt: string) {
  const condensed = prompt.replace(/\s+/g, " ").trim();
  if (!condensed) {
    return "Implement the requested change";
  }
  return condensed.length > 80 ? `${condensed.slice(0, 77)}…` : condensed;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function makeRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
