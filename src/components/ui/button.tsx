import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-retro font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground border-3 border-vice-pink hover:scale-105 transition-all duration-300 shadow-[4px_4px_0px_hsl(var(--vice-pink))] hover:shadow-[6px_6px_0px_hsl(var(--vice-pink))]",
        destructive: "bg-destructive text-destructive-foreground border-3 border-destructive hover:bg-destructive/90",
        outline: "border-3 border-vice-cyan bg-background text-vice-cyan hover:bg-vice-cyan/10 shadow-[4px_4px_0px_hsl(var(--vice-cyan))] hover:shadow-[6px_6px_0px_hsl(var(--vice-cyan))]",
        secondary: "bg-gradient-secondary text-secondary-foreground border-3 border-vice-cyan hover:scale-105 transition-all duration-300 shadow-[4px_4px_0px_hsl(var(--vice-cyan))] hover:shadow-[6px_6px_0px_hsl(var(--vice-cyan))]",
        ghost: "hover:bg-vice-purple/20 hover:text-vice-purple text-foreground border-2 border-transparent hover:border-vice-purple",
        link: "text-primary underline-offset-4 hover:underline text-vice-pink hover:text-vice-cyan transition-colors",
        vice: "bg-gradient-primary text-primary-foreground border-3 border-vice-pink hover:scale-105 transition-all duration-300 font-cyber shadow-[4px_4px_0px_hsl(var(--vice-pink))] hover:shadow-[6px_6px_0px_hsl(var(--vice-pink))]",
        cyber: "bg-gradient-secondary text-secondary-foreground border-3 border-vice-cyan hover:scale-105 transition-all duration-300 font-cyber shadow-[4px_4px_0px_hsl(var(--vice-cyan))] hover:shadow-[6px_6px_0px_hsl(var(--vice-cyan))]",
        neon: "bg-gradient-accent text-primary-foreground border-3 border-vice-orange hover:scale-105 transition-all duration-300 shadow-[4px_4px_0px_hsl(var(--vice-orange))] hover:shadow-[6px_6px_0px_hsl(var(--vice-orange))]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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