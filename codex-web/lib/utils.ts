import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StepId = "method" | "api-key" | "subscription" | "complete";

export interface Step {
  id: StepId;
  title: string;
  description: string;
}

export const AUTH_STEPS: Step[] = [
  {
    id: "method",
    title: "Choose authentication",
    description: "Select how you want to authenticate with Codex."
  },
  {
    id: "subscription",
    title: "Sign in with subscription",
    description: "Authenticate with your OpenAI account to link a subscription."
  },
  {
    id: "api-key",
    title: "Use an API key",
    description: "Provide a direct API key when subscriptions are not available."
  },
  {
    id: "complete",
    title: "Ready to launch",
    description: "Run the CLI with the configuration we generated for you."
  }
];

export function getStepById(id: StepId) {
  return AUTH_STEPS.find((step) => step.id === id) ?? AUTH_STEPS[0];
}