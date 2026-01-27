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
import { Copy, Check } from 'lucide-react'
import React from 'react'

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const [copied, setCopied] = React.useState<Record<string, boolean>>({});

  const handleCopy = (id: string, title?: React.ReactNode, description?: React.ReactNode) => {
    // Only copy if title or description exists.
    if (!title && !description) return;
    
    const textToCopy = `${title ? `Title: ${String(title)}` : ''}${description ? `\nDescription: ${String(description)}` : ''}`.trim();
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(prev => ({...prev, [id]: true}));
        setTimeout(() => {
            setCopied(prev => ({...prev, [id]: false}));
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            
            {action || (
              <div className="flex flex-col gap-2 self-center">
                <ToastAction altText="OK" onClick={() => dismiss(id)}>OK</ToastAction>
                <ToastAction altText="Copy" onClick={() => handleCopy(id, title, description)}>
                    {copied[id] ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied[id] ? 'Copied' : 'Copy'}
                </ToastAction>
              </div>
            )}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
