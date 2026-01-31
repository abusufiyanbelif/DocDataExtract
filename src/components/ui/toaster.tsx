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
import { Button } from "./button"

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

        return (
          <Toast key={id} {...props}>
            <div className="w-full grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
               {!isConfirmationToast ? (
                <div className="mt-4 flex gap-2">
                    {action}
                    <ToastAction asChild altText="OK" className="w-full flex-1">
                        <Button variant="secondary" size="sm" className="w-full">OK</Button>
                    </ToastAction>
                    <ToastAction asChild altText="Copy message" onClick={(e) => { e.preventDefault(); handleCopy(title, description); }} className="w-full flex-1">
                        <Button variant="outline" size="sm" className="w-full">Copy</Button>
                    </ToastAction>
                </div>
              ) : (action)}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
