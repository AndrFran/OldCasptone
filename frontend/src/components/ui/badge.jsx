import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "border border-gray-200 bg-gray-100 text-gray-900",
  secondary: "border border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200",
  destructive: "border border-red-500 bg-red-50 text-red-700",
  outline: "text-gray-950",
  success: "border border-green-500 bg-green-50 text-green-700",
  warning: "border border-yellow-500 bg-yellow-50 text-yellow-700",
  info: "border border-blue-500 bg-blue-50 text-blue-700",
}

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      badgeVariants[variant],
      className
    )}
    {...props}
  />
))
Badge.displayName = "Badge"

export { Badge, badgeVariants }
