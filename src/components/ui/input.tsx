import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  size?: "sm" | "md" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-[var(--input-height-sm)] text-body-small",
      md: "h-[var(--input-height-md)] text-body",
      lg: "h-[var(--input-height-lg)] text-body-large",
    };

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-[var(--input-border-radius)] border-[var(--input-border-width)] border-input bg-background px-[var(--input-padding-x)] py-2 ring-offset-background file:border-0 file:bg-transparent file:text-body-small file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[var(--input-focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-normal ease-standard",
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
