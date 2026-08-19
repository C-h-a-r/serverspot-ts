import * as React from "react";
import { cn } from "../lib/utils";

export const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "outline" }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variant === "default" && "bg-accent/20 text-accent",
      variant === "secondary" && "bg-muted text-muted-foreground",
      variant === "outline" && "border border-border text-foreground",
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";
