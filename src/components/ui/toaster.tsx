
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, toast: showToast } = useToast()

  const handleCopy = (title?: React.ReactNode, description?: React.ReactNode) => {
    const textToCopy = [
      typeof title === 'string' ? title : '',
      typeof description === 'string' ? description : ''
    ].filter(Boolean).join('\n');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      showToast({
        title: "Copied!",
        description: "The message has been copied to your clipboard.",
        variant: "success",
        duration: 2000,
      });
    } else {
      showToast({
        title: "Nothing to Copy",
        description: "The toast content could not be copied as text.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isConfirmationToast = props.duration && props.duration <= 3000;
        
        const showCustomButtons = !isConfirmationToast && ['default', 'success', 'destructive'].includes(props.variant || 'default');

        return (
          <Toast key={id} {...props}>
            <div className="w-full grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
               {showCustomButtons ? (
                <div className="mt-4 flex gap-2">
                    <ToastAction
                        altText="Copy"
                        className={cn(
                            "border",
                            props.variant === 'success' && "border-success-foreground text-success-foreground hover:bg-success-foreground hover:text-success",
                            props.variant === 'destructive' && "border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive",
                            props.variant === 'default' && "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopy(title, description);
                        }}
                      >
                        Copy
                      </ToastAction>
                      <ToastAction
                        altText="OK"
                        className={cn(
                            "border-transparent",
                            props.variant === 'success' && "bg-success-foreground text-primary-foreground hover:bg-success-foreground/90",
                            props.variant === 'destructive' && "bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 hover:text-destructive",
                            props.variant === 'default' && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        OK
                      </ToastAction>
                </div>
              ) : (
                action && <div className="mt-4 flex gap-2">{action}</div>
              )}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
