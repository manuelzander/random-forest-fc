import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-retro font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-neon hover:shadow-glow-pink border border-vice-pink/30 hover:scale-105 transition-all duration-300",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground border-vice-cyan/50 text-vice-cyan hover:shadow-glow-cyan hover:bg-vice-cyan/10",
        secondary: "bg-gradient-secondary text-secondary-foreground shadow-cyber hover:shadow-glow-cyan border border-vice-cyan/30 hover:scale-105 transition-all duration-300",
        ghost: "hover:bg-accent hover:text-accent-foreground text-vice-light hover:bg-vice-purple/20 hover:text-vice-purple",
        link: "text-primary underline-offset-4 hover:underline text-vice-pink hover:text-vice-cyan transition-colors",
        vice: "bg-gradient-primary text-primary-foreground shadow-neon hover:shadow-glow-pink border border-vice-pink/30 hover:scale-105 transition-all duration-300 font-cyber",
        cyber: "bg-gradient-secondary text-secondary-foreground shadow-cyber hover:shadow-glow-cyan border border-vice-cyan/30 hover:scale-105 transition-all duration-300 font-cyber",
        neon: "bg-gradient-accent text-primary-foreground border border-vice-orange/30 shadow-[0_0_20px_hsl(var(--vice-orange)/0.5)] hover:shadow-[0_0_30px_hsl(var(--vice-orange)/0.8)] hover:scale-105 transition-all duration-300",
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