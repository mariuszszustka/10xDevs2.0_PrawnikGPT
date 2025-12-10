import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  size?: "sm" | "md" | "lg";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "min-h-[var(--input-height-sm)] text-body-small px-[var(--input-padding-x)]",
      md: "min-h-[var(--input-height-md)] text-body px-[var(--input-padding-x)]",
      lg: "min-h-[var(--input-height-lg)] text-body-large px-[var(--input-padding-x)]",
    };

    return (
      <textarea
        className={cn(
          "flex w-full rounded-[var(--input-border-radius)] border-[var(--input-border-width)] border-input bg-background py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[var(--input-focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-normal ease-standard",
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
