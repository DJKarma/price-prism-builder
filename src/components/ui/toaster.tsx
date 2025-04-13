
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
import { useEffect, useState } from "react"

// Slot machine effect for toast entrance
const SlotMachineToast = ({ children, ...props }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Delay to allow for slot machine effect
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      className={cn(
        "transform transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {/* Changed to bottom-right positioning and flex-col */}
      <div className="fixed bottom-0 right-0 z-[100] flex flex-col p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2">
        {toasts.map(function ({ id, title, description, action, variant, className, ...props }, index) {
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
          
          // Add entry delay based on index (no stagger for better visibility)
          const entryDelay = 0; // Removed staggered delay to prevent overlap feeling
          
          return (
            <SlotMachineToast key={id} style={{ transitionDelay: `${entryDelay}ms` }}>
              <Toast 
                {...props} 
                className={cn(
                  "animate-enter flex items-start gap-3 border-l-4 shadow-lg", 
                  variant === "destructive" ? "border-l-red-500 bg-red-50" : 
                  className?.includes("success") ? "border-l-green-500 bg-green-50" : 
                  className?.includes("warning") ? "border-l-amber-500 bg-amber-50" : 
                  "border-l-blue-500 bg-blue-50",
                  className
                )}
              >
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
            </SlotMachineToast>
          );
        })}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}
