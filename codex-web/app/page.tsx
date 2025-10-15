import { AuthFlow } from "@/components/auth/auth-flow";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-8">
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
          <AuthFlow />
        </CardContent>
      </Card>
    </div>
  );
}
