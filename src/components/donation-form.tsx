
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractPaymentDetails, ExtractPaymentDetailsOutput } from '@/ai/flows/extract-payment-details';
import { Separator } from './ui/separator';

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
  const [scanResult, setScanResult] = useState<ExtractPaymentDetailsOutput | null>(null);
  const [isScanPreviewOpen, setIsScanPreviewOpen] = useState(false);

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
    },
  });

  const { formState: { isSubmitting }, register, watch, setValue } = form;
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
    } else if (donation?.screenshotUrl) {
        setPreview(donation.screenshotUrl);
    } else {
        setPreview(null);
    }
  }, [screenshotFile, donation?.screenshotUrl]);

  const handleScanPaymentDetails = async () => {
    if (!preview) {
        toast({
            title: "No Image to Scan",
            description: "Please upload a screenshot first.",
            variant: "destructive",
        });
        return;
    }
    setIsScanning(true);
    toast({ title: "Scanning...", description: "Extracting details from the payment screenshot." });
    try {
        const response = await extractPaymentDetails({ photoDataUri: preview });
        setScanResult(response);
        setIsScanPreviewOpen(true);
    } catch (error: any) {
        console.warn("Payment scan failed:", error);
        toast({
            title: "Scan Failed",
            description: error.message || "Could not automatically read the screenshot. Please enter the details manually.",
            variant: "destructive",
        });
    } finally {
        setIsScanning(false);
    }
  };
  
  const handleApplyScan = () => {
    if (!scanResult) return;
    
    let detailsFound = false;
    if (scanResult.receiverName) {
        setValue('receiverName', scanResult.receiverName, { shouldValidate: true });
        detailsFound = true;
    }
    if (scanResult.amount) {
        setValue('amount', scanResult.amount, { shouldValidate: true });
        detailsFound = true;
    }
    if (scanResult.transactionId) {
        setValue('transactionId', scanResult.transactionId, { shouldValidate: true });
        detailsFound = true;
    }
    if (scanResult.date && /^\d{4}-\d{2}-\d{2}$/.test(scanResult.date)) {
        setValue('donationDate', scanResult.date, { shouldValidate: true });
        detailsFound = true;
    }

    if (detailsFound) {
        toast({
            title: "Scan Applied",
            description: "Donation details have been populated from the scan.",
            variant: "success",
        });
    } else {
         toast({
            title: "Scan Incomplete",
            description: "Could not find any details to extract. Please fill them manually.",
            variant: "default",
        });
    }
    setIsScanPreviewOpen(false);
    setScanResult(null);
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
                                  <Input type="file" accept="image/*" {...register('screenshotFile')} />
                              </FormControl>
                              <FormDescription>
                                  Upload a screenshot of the transaction.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  {preview && (
                      <div className="relative w-full h-48 mt-2 rounded-md overflow-hidden border">
                          <Image src={preview} alt="Donation screenshot preview" fill style={{ objectFit: 'contain' }} />
                      </div>
                  )}
                  {preview && (
                      <Button 
                          type="button" 
                          className="w-full"
                          onClick={handleScanPaymentDetails}
                          disabled={isScanning}
                      >
                          {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                          Scan Screenshot
                      </Button>
                  )}
                  <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Transaction ID</FormLabel>
                              <FormControl>
                                  <Input 
                                      placeholder="Optional, e.g., UPI ID" 
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

      <Dialog open={isScanPreviewOpen} onOpenChange={setIsScanPreviewOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Review Scan Results</DialogTitle>
                <DialogDescription>
                    Review the extracted data below. Click "Fill Form" to apply it to your donation.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {scanResult ? (
                    Object.entries(scanResult).map(([key, value]) => value ? (
                        <div key={key} className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={key} className="text-right capitalize">
                                {key.replace(/([A-Z])/g, ' $1')}
                            </Label>
                            <Input id={key} value={value} readOnly className="col-span-2" />
                        </div>
                    ) : null)
                ) : (
                    <p className="text-center text-muted-foreground">No details could be extracted.</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsScanPreviewOpen(false)}>Cancel</Button>
                <Button onClick={handleApplyScan}>Fill Form</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
