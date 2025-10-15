"use client";

import * as React from "react";

import { AuthFlow } from "@/components/auth/auth-flow";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Workspace } from "@/components/workspace/workspace";
import { type AuthSession } from "@/lib/auth";

export default function HomePage() {
  const [session, setSession] = React.useState<AuthSession | null>(null);

  return (
    <div className="space-y-10">
      <section className="max-w-3xl space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Authenticate just like the Codex CLI</h2>
        <p className="text-lg text-muted-foreground">
          Follow the same guided login used in the terminal experience. Choose between a subscription-backed session or a raw
          API key without leaving your browser.
        </p>
        <Alert variant="warning" title="Preview">
          This prototype mirrors the CLI workflow but does not connect to live services. Use it to understand the flow or demo it
          to your team.
        </Alert>
      </section>
      <Card>
        <CardContent className="pt-6">
          <AuthFlow onSessionReady={setSession} />
        </CardContent>
      </Card>
      {session ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Run Codex from the browser</h3>
            <p className="text-muted-foreground">
              Use the authenticated session above to chat with Codex, review plans, inspect diffs, and follow the same approval
              loop the CLI uses.
            </p>
          </div>
          <Workspace session={session} />
        </section>
      ) : null}
    </div>
  );
}