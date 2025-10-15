# Codex Web

A Next.js web experience that mirrors the onboarding flow of the Codex CLI. It guides users through the same subscription-first
authentication path with an API key fallback, demonstrating how Codex collects credentials before launching the agent.

## Tech stack

- [Next.js app router](https://nextjs.org/docs/app) with React 19 support
- [Tailwind CSS 4.1](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/) primitives
- [Radix UI](https://www.radix-ui.com/) under the hood for accessible interactive components

## Getting started

Install [Bun 1.3](https://bun.sh/) and then bootstrap the workspace:

```bash
bun install
bun run dev
```

The hosted flow is a demo: it simulates the CLI behaviour without calling production services. Use it to walk teammates through
the authentication experience or to test UI copy.
