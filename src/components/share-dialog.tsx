'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Mail, MessageSquare } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: {
    title: string;
    text: string;
    url: string;
  };
}

export function ShareDialog({ open, onOpenChange, shareData }: ShareDialogProps) {
  const { toast } = useToast();
  const { title, text, url } = shareData;

  const copyToClipboard = (content: string, message: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: message,
        variant: 'success',
        duration: 2000,
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: 'Copy Failed',
        description: 'Could not copy content to clipboard.',
        variant: 'destructive',
      });
    });
  };

  // Using a generic icon for Twitter/X as a direct one isn't in lucide-react
  const TwitterIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current">
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Campaign Summary</DialogTitle>
          <DialogDescription>
            Share this campaign with your network to help spread the word.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="share-url" className="text-sm font-medium">
                    Shareable Link
                </Label>
                <div className="flex items-center gap-2">
                    <Input id="share-url" value={url} readOnly className="h-9" />
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => copyToClipboard(url, 'Link copied to clipboard!')}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n' + url)}`} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="mr-2" /> WhatsApp
                    </a>
                </Button>
                 <Button asChild variant="outline">
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <TwitterIcon /> X (Twitter)
                    </a>
                </Button>
                <Button asChild variant="outline">
                    <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`} target="_blank" rel="noopener noreferrer">
                        <Mail className="mr-2" /> Email
                    </a>
                </Button>
                 <Button variant="outline" onClick={() => copyToClipboard(text, 'Summary text copied!')}>
                    <Copy className="mr-2" /> Copy Text
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
