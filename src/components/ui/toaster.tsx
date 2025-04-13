
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, className, ...props }) {
        // Determine icon based on variant
        let Icon = Info
        let iconClass = "text-blue-500"
        
        if (variant === "destructive") {
          Icon = XCircle
          iconClass = "text-red-500"
        } else if (className?.includes("success")) {
          Icon = CheckCircle
          iconClass = "text-green-500"
        } else if (className?.includes("warning")) {
          Icon = AlertCircle
          iconClass = "text-amber-500"
        }
        
        return (
          <Toast key={id} {...props} className={cn(
            "animate-enter flex items-start gap-3 border-l-4", 
            variant === "destructive" ? "border-l-red-500" : 
            className?.includes("success") ? "border-l-green-500" : 
            className?.includes("warning") ? "border-l-amber-500" : 
            "border-l-blue-500",
            className
          )}>
            <div className="flex-shrink-0 pt-0.5">
              <Icon className={cn("h-5 w-5", iconClass)} />
            </div>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
