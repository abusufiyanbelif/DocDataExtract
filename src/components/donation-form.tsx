
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Donation } from '@/lib/types';
import { Loader2, ScanLine, Replace, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';

const formSchema = z.object({
  donorName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  donorPhone: z.string().length(10, { message: "Phone must be exactly 10 digits." }).optional().or(z.literal('')),
  receiverName: z.string().min(2, { message: "Receiver name must be at least 2 characters." }),
  referral: z.string().min(1, { message: "Referral is required." }),
  amount: z.coerce.number().min(1, { message: "Amount must be at least 1." }),
  type: z.enum(['Zakat', 'Sadqa', 'Interest', 'Lillah', 'General']),
  donationType: z.enum(['Cash', 'Online Payment', 'Check', 'Other']),
  transactionId: z.string().optional(),
  donationDate: z.string().min(1, { message: "Donation date is required."}),
  status: z.enum(['Verified', 'Pending', 'Canceled']),
  screenshotFile: z.any().optional(),
  screenshotDeleted: z.boolean().optional(),
  isTransactionIdRequired: z.boolean().default(true),
}).refine(data => {
    if (data.donationType === 'Online Payment' && data.isTransactionIdRequired) {
        return data.transactionId && data.transactionId.trim().length > 0;
    }
    return true;
}, {
    message: "Transaction ID is required when this option is enabled.",
    path: ['transactionId'],
});

export type DonationFormData = z.infer<typeof formSchema>;

interface DonationFormProps {
  donation?: Donation | null;
  onSubmit: (data: DonationFormData) => void;
  onCancel: () => void;
}

export function DonationForm({ donation, onSubmit, onCancel }: DonationFormProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const form = useForm<DonationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      donorName: donation?.donorName || '',
      donorPhone: donation?.donorPhone || '',
      receiverName: donation?.receiverName || '',
      referral: donation?.referral || '',
      amount: donation?.amount || 0,
      type: donation?.type || 'General',
      donationType: donation?.donationType || 'Online Payment',
      transactionId: donation?.transactionId || '',
      donationDate: donation?.donationDate || new Date().toISOString().split('T')[0],
      status: donation?.status || 'Pending',
      screenshotDeleted: false,
      isTransactionIdRequired: true,
    },
  });

  const { formState: { isSubmitting }, register, watch, setValue, getValues } = form;
  const [preview, setPreview] = useState<string | null>(donation?.screenshotUrl || null);
  const screenshotFile = watch('screenshotFile');
  const donationTypeValue = watch('donationType');

  useEffect(() => {
    const fileList = screenshotFile as FileList | undefined;
    if (fileList && fileList.length > 0) {
        const file = fileList[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setValue('screenshotDeleted', false);
    } else if (!watch('screenshotDeleted')) {
        setPreview(donation?.screenshotUrl || null);
    } else {
        setPreview(null);
    }
  }, [screenshotFile, donation?.screenshotUrl, watch, setValue]);
  
  const handleDeleteScreenshot = () => {
    setValue('screenshotFile', null);
    setValue('screenshotDeleted', true);
    setPreview(null);
    toast({ title: 'Image Marked for Deletion', description: 'The screenshot will be permanently deleted when you save the changes.', variant: 'default' });
  };
  
  const handleScanScreenshot = async () => {
    const fileList = getValues('screenshotFile') as FileList | undefined;
    if (!fileList || fileList.length === 0) {
        toast({ title: "No File", description: "Please upload a screenshot to scan.", variant: "destructive" });
        return;
    }
    
    setIsScanning(true);
    toast({ title: "Scanning screenshot...", description: "Please wait while the AI extracts the details." });

    const file = fileList[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const dataUri = e.target?.result as string;
        if (!dataUri) {
            toast({ title: "Read Error", description: "Could not read the uploaded file.", variant: "destructive" });
            setIsScanning(false);
            return;
        }

        try {
            const apiResponse = await fetch('/api/scan-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoDataUri: dataUri }),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'The server returned an error.');
            }
            
            const response = await apiResponse.json();
            
            const filledFields: string[] = [];
            if (response.receiverName) {
                setValue('receiverName', response.receiverName, { shouldValidate: true });
                filledFields.push('Receiver Name');
            }
            if (response.amount) {
                setValue('amount', response.amount, { shouldValidate: true });
                filledFields.push('Amount');
            }
            if (response.transactionId) {
                setValue('transactionId', response.transactionId, { shouldValidate: true });
                filledFields.push('Transaction ID');
            }
            if (response.date && /^\d{4}-\d{2}-\d{2}$/.test(response.date)) {
                setValue('donationDate', response.date, { shouldValidate: true });
                filledFields.push('Donation Date');
            }

            if (filledFields.length > 0) {
                toast({
                    title: "Autofill Successful",
                    description: `Filled: ${filledFields.join(', ')}.`,
                    variant: "success",
                });
            } else {
                toast({
                    title: "No Details Found",
                    description: "Could not find any details to autofill from the image.",
                    variant: "default",
                });
            }

        } catch (error: any) {
             console.warn("Screenshot scan failed:", error);
             toast({
                title: "Scan Failed",
                description: error.message || "Could not automatically read the screenshot.",
                variant: "destructive",
            });
        } finally {
            setIsScanning(false);
        }
    };
    reader.onerror = () => {
        toast({ title: "File Error", description: "An error occurred while reading the file.", variant: "destructive" });
        setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="donorName"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Donor Name *</FormLabel>
                      <FormControl>
                          <Input placeholder="e.g. John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="donorPhone"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Donor Phone</FormLabel>
                      <FormControl>
                          <Input placeholder="10-digit mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="receiverName"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Receiver Name *</FormLabel>
                      <FormControl>
                          <Input placeholder="e.g. Asif Shaikh" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="referral"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Referral *</FormLabel>
                      <FormControl>
                          <Input placeholder="Referred by..." {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Amount (Rupee) *</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Zakat">Zakat</SelectItem>
                              <SelectItem value="Sadqa">Sadqa</SelectItem>
                              <SelectItem value="Interest">Interest</SelectItem>
                              <SelectItem value="Lillah">Lillah</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
          </div>

          <FormField
              control={form.control}
              name="donationType"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Donation Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Select donation type" />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="Online Payment">Online Payment</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
          />

          {donationTypeValue === 'Online Payment' && (
              <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Online Payment Details</h3>
                  <Separator />
                  <FormField
                      control={form.control}
                      name="screenshotFile"
                      render={() => (
                          <FormItem>
                              <FormLabel>Screenshot</FormLabel>
                              <FormControl>
                                  <Input id="screenshot-file-input" type="file" accept="image/*" {...register('screenshotFile')} />
                              </FormControl>
                              <FormDescription>
                                  Upload a screenshot of the transaction.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  {preview && (
                      <div className="relative group w-full h-48 mt-2 rounded-md overflow-hidden border">
                          <Image src={preview} alt="Donation screenshot preview" fill style={{ objectFit: 'contain' }} />
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" size="icon" variant="outline" onClick={() => document.getElementById('screenshot-file-input')?.click()}>
                                    <Replace className="h-5 w-5"/>
                                    <span className="sr-only">Replace Image</span>
                                </Button>
                                <Button type="button" size="icon" variant="destructive" onClick={handleDeleteScreenshot}>
                                    <Trash2 className="h-5 w-5"/>
                                    <span className="sr-only">Delete Image</span>
                                </Button>
                            </div>
                      </div>
                  )}
                  {screenshotFile?.length > 0 && (
                    <Button 
                        type="button" 
                        className="w-full"
                        onClick={handleScanScreenshot}
                        disabled={isScanning}
                    >
                        {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                        Scan Screenshot
                    </Button>
                  )}
                  <FormField
                    control={form.control}
                    name="isTransactionIdRequired"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    id="isTransactionIdRequired"
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel htmlFor="isTransactionIdRequired">
                                    Require & Verify Transaction ID
                                </FormLabel>
                                <FormDescription>
                                    If checked, the ID is mandatory and checked for duplicates.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                    />
                  <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Transaction ID {watch('isTransactionIdRequired') && <span className="text-destructive">*</span>}</FormLabel>
                              <FormControl>
                                  <Input 
                                      placeholder="e.g., UPI ID" 
                                      {...field} 
                                      value={field.value ?? ''}
                                  />
                              </FormControl>
                              <FormDescription>
                                  Helps prevent duplicate entries. Can be auto-filled by scanning.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="donationDate"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Donation Date *</FormLabel>
                      <FormControl>
                          <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Verified">Verified</SelectItem>
                              <SelectItem value="Canceled">Canceled</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Donation'}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
