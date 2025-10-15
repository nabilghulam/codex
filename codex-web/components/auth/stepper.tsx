"use client";

import * as React from "react";

import { AUTH_STEPS, cn, type StepId } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StepperProps {
  activeStep: StepId;
}

export function Stepper({ activeStep }: StepperProps) {
  const activeIndex = React.useMemo(
    () => AUTH_STEPS.findIndex((step) => step.id === activeStep),
    [activeStep]
  );

  return (
    <ol className="space-y-4">
      {AUTH_STEPS.map((step, index) => {
        const state = index === activeIndex ? "active" : index < activeIndex ? "complete" : "pending";
        return (
          <li key={step.id} className="flex items-start gap-3">
            <Badge
              variant={state === "complete" ? "secondary" : "outline"}
              className={cn(
                "mt-1 h-6 w-6 shrink-0 items-center justify-center rounded-full text-center font-semibold",
                "inline-flex",
                state === "active" && "border-primary text-primary",
                state === "complete" && "border-secondary bg-secondary text-secondary-foreground"
              )}
            >
              {index + 1}
            </Badge>
            <div>
              <p className={cn("font-semibold", state === "pending" && "text-muted-foreground")}>{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
