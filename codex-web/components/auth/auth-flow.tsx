"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stepper } from "@/components/auth/stepper";
import { AUTH_STEPS, getStepById, type StepId } from "@/lib/utils";

interface LogEntry {
  id: string;
  message: string;
  tone: "info" | "success" | "warning";
}

type AuthMethod = "subscription" | "api-key" | null;

type SubscriptionState =
  | { status: "idle"; email: string }
  | { status: "sending"; email: string }
  | { status: "link-sent"; email: string; expiresAt: string }
  | { status: "verified"; email: string; expiresAt: string };

type ApiKeyState =
  | { status: "idle"; key: string }
  | { status: "validating"; key: string }
  | { status: "ready"; key: string };

export function AuthFlow() {
  const createLogId = React.useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }, []);

  const [step, setStep] = React.useState<StepId>("method");
  const [method, setMethod] = React.useState<AuthMethod>(null);
  const [subscription, setSubscription] = React.useState<SubscriptionState>({ status: "idle", email: "" });
  const [apiKey, setApiKey] = React.useState<ApiKeyState>({ status: "idle", key: "" });
  const [logs, setLogs] = React.useState<LogEntry[]>(() => [
    {
      id: "intro",
      message: "Welcome to Codex on the web. Let’s configure authentication just like the CLI wizard.",
      tone: "info"
    }
  ]);

  const appendLog = React.useCallback(
    (entry: Omit<LogEntry, "id">) => {
      setLogs((current) => [
        ...current,
        {
        id: createLogId(),
          ...entry
        }
      ]);
    },
    [createLogId]
  );

  const handleMethodSelect = React.useCallback(
    (nextMethod: Exclude<AuthMethod, null>) => {
      setMethod(nextMethod);
      setStep(nextMethod === "subscription" ? "subscription" : "api-key");
      appendLog({
        message:
          nextMethod === "subscription"
            ? "Selected subscription authentication. We’ll open the browser sign-in flow."
            : "Selected API key authentication. We’ll prompt for your key just like the CLI.",
        tone: "info"
      });
    },
    [appendLog]
  );

  const handleSubscriptionSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      if (!email) {
        appendLog({
          message: "Enter the email connected to your OpenAI subscription to continue.",
          tone: "warning"
        });
        return;
      }

      setSubscription({ status: "sending", email });
      appendLog({
        message: `Requesting a magic link for ${email}…`,
        tone: "info"
      });

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString();
      setSubscription({ status: "link-sent", email, expiresAt });
      appendLog({
        message: "Magic link sent. Check your inbox and confirm to finish linking your subscription.",
        tone: "success"
      });
    },
    [appendLog]
  );

  const handleSubscriptionVerify = React.useCallback(() => {
    if (subscription.status !== "link-sent") return;
    setSubscription({ ...subscription, status: "verified" });
    appendLog({
      message: "Subscription verified. Codex CLI will now reuse this session for authenticated requests.",
      tone: "success"
    });
    setStep("complete");
  }, [appendLog, subscription]);

  const handleApiKeySubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const key = String(formData.get("apiKey") ?? "").trim();
      if (!key) {
        appendLog({
          message: "Provide an API key before continuing.",
          tone: "warning"
        });
        return;
      }

      setApiKey({ status: "validating", key });
      appendLog({ message: "Validating your API key…", tone: "info" });
      await new Promise((resolve) => setTimeout(resolve, 800));
      setApiKey({ status: "ready", key });
      appendLog({
        message: "API key stored locally. You can now launch Codex with key-based auth.",
        tone: "success"
      });
      setStep("complete");
    },
    [appendLog]
  );

  const currentStep = getStepById(step);

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-xl border bg-card p-6 shadow-sm">
        <Stepper activeStep={step} />
      </aside>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "method" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <h3 className="text-base font-semibold">Subscription (recommended)</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mirrors the CLI flow by directing you through the hosted OpenAI login to confirm your active plan.
                  </p>
                  <Button className="mt-4 w-full" onClick={() => handleMethodSelect("subscription")}>
                    Continue with subscription
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <h3 className="text-base font-semibold">API key</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Provide a raw API key. Ideal for service accounts or when subscriptions are not available.
                  </p>
                  <Button variant="secondary" className="mt-4 w-full" onClick={() => handleMethodSelect("api-key")}>
                    Use an API key instead
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "subscription" ? (
              <Tabs defaultValue="link" className="w-full">
                <TabsList>
                  <TabsTrigger value="link">Send magic link</TabsTrigger>
                  <TabsTrigger value="status">Session status</TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="space-y-4">
                  <form className="space-y-4" onSubmit={handleSubscriptionSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="email">OpenAI account email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        defaultValue={subscription.email}
                        disabled={subscription.status === "sending" || subscription.status === "verified"}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={subscription.status === "sending" || subscription.status === "verified"}>
                      {subscription.status === "sending" ? "Sending link…" : "Email me a login link"}
                    </Button>
                  </form>
                  {subscription.status === "link-sent" ? (
                    <Alert variant="success" title="Link sent">
                      <p>
                        Open the email titled <strong>“Sign in to Codex”</strong> and approve the request before {subscription.expiresAt}.
                      </p>
                      <Button className="mt-4" onClick={handleSubscriptionVerify}>
                        I have approved the login
                      </Button>
                    </Alert>
                  ) : null}
                  {subscription.status === "verified" ? (
                    <Alert variant="success" title="Subscription confirmed">
                      Your browser session is now linked. We stored the refresh token securely, matching how the CLI persists it.
                    </Alert>
                  ) : null}
                </TabsContent>
                <TabsContent value="status" className="space-y-3">
                  <SubscriptionStatus subscription={subscription} />
                </TabsContent>
              </Tabs>
            ) : null}

            {step === "api-key" ? (
              <form className="space-y-4" onSubmit={handleApiKeySubmit}>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">OpenAI API key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    placeholder="sk-..."
                    defaultValue={apiKey.key}
                    disabled={apiKey.status === "validating" || apiKey.status === "ready"}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The key stays on your device. Codex CLI reads it from <code>.codex/config.json</code>, the same as the terminal setup.
                  </p>
                </div>
                <Button type="submit" disabled={apiKey.status === "validating" || apiKey.status === "ready"}>
                  {apiKey.status === "validating" ? "Validating…" : "Save key"}
                </Button>
              </form>
            ) : null}

            {step === "complete" ? (
              <CompletionSummary method={method} subscription={subscription} apiKey={apiKey} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity log</CardTitle>
            <CardDescription>Everything Codex CLI would print to your terminal, replayed here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.map((log) => (
                <LogLine key={log.id} entry={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SubscriptionStatusProps {
  subscription: SubscriptionState;
}

function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  switch (subscription.status) {
    case "idle":
      return (
        <Alert>
          Provide the email tied to your OpenAI account. We will trigger the same verification Codex CLI uses.
        </Alert>
      );
    case "sending":
      return (
        <Alert variant="loading" title="Sending">
          Contacting OpenAI to deliver your one-time sign-in link…
        </Alert>
      );
    case "link-sent":
      return (
        <Alert variant="success" title="Action required">
          Approve the login before {subscription.expiresAt}. We will wait here until you confirm.
        </Alert>
      );
    case "verified":
      return (
        <Alert variant="success" title="Linked">
          Subscription authentication is active. Codex CLI will bootstrap directly into your workspace.
        </Alert>
      );
  }
}

interface CompletionSummaryProps {
  method: AuthMethod;
  subscription: SubscriptionState;
  apiKey: ApiKeyState;
}

function CompletionSummary({ method, subscription, apiKey }: CompletionSummaryProps) {
  const showSubscription = method === "subscription" && subscription.status === "verified";
  const showApiKey = method === "api-key" && apiKey.status === "ready";

  return (
    <div className="space-y-6">
      <Alert variant="success" title="You are ready to use Codex">
        Launch the CLI exactly as you would from the terminal. The configuration below matches what we just set up together.
      </Alert>
      {showSubscription ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Session details</h3>
          <p className="text-sm text-muted-foreground">
            We stored a session for <strong>{subscription.email}</strong>. The CLI reuses it automatically when you run <code>codex</code>.
          </p>
        </div>
      ) : null}
      {showApiKey ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Configuration snippet</h3>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
{`{
  "auth": {
    "provider": "openai",
    "apiKey": "${apiKey.key.replace(/.(?=.{4})/g, "*")}"
  }
}`}
          </pre>
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="font-semibold">Next steps</h3>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
          <li>Open your terminal in the project you want to work on.</li>
          <li>Run <code>codex</code> and choose a recipe or start chatting.</li>
          <li>Use <code>Shift + Enter</code> to send multi-line prompts—just like the CLI.</li>
        </ol>
      </div>
    </div>
  );
}

interface LogLineProps {
  entry: LogEntry;
}

function LogLine({ entry }: LogLineProps) {
  const toneClass =
    entry.tone === "success"
      ? "text-green-600 dark:text-green-400"
      : entry.tone === "warning"
        ? "text-yellow-700 dark:text-yellow-400"
        : "text-muted-foreground";
  return (
    <p className={toneClass}>
      <span className="text-foreground">codex</span> › {entry.message}
    </p>
  );
}
