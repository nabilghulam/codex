import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const iconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  loading: Loader2
};

export type AlertVariant = keyof typeof iconMap;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

export function Alert({
  className,
  variant = "default",
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = iconMap[variant];
  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground",
        variant === "success" && "border-green-500/40 text-green-600 dark:text-green-400",
        variant === "warning" && "border-yellow-500/40 text-yellow-700 dark:text-yellow-400",
        variant === "loading" && "border-primary/40 text-primary",
        className
      )}
      {...props}
    >
      <Icon className={cn("mt-0.5 h-4 w-4", variant === "loading" && "animate-spin")} />
      <div className="space-y-1">
        {title ? <p className="font-semibold text-foreground">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
