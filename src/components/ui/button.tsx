import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active rounded-md shadow-sm hover:shadow-md duration-normal ease-standard",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 rounded-md shadow-sm hover:shadow-md duration-normal ease-standard",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 rounded-md duration-normal ease-standard",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 rounded-md duration-normal ease-standard",
        subtle: "bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/80 rounded-md duration-normal ease-standard",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 rounded-md duration-normal ease-standard",
        link: "text-primary underline-offset-4 hover:underline duration-fast ease-standard",
      },
      size: {
        sm: "h-[var(--button-height-sm)] px-[var(--button-padding-x-sm)] text-body-small rounded-[var(--button-radius)]",
        default: "h-[var(--button-height-md)] px-[var(--button-padding-x-md)] text-body rounded-[var(--button-radius)]",
        lg: "h-[var(--button-height-lg)] px-[var(--button-padding-x-lg)] text-body-large rounded-[var(--button-radius)]",
        icon: "h-[var(--button-height-md)] w-[var(--button-height-md)] rounded-[var(--button-radius)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
