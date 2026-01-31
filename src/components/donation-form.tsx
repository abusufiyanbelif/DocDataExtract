
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
import { Loader2, ScanLine, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractPaymentDetails } from '@/ai/flows/extract-payment-details';
import { extractAndCorrectText } from '@/ai/flows/extract-and-correct-text';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type StorageReference } from 'firebase/storage';

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
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [scannedText, setScannedText] = useState('');
  const storage = useStorage();

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

  const { formState: { isSubmitting }, register, watch, setValue, getValues } = form;
  const [preview, setPreview] = useState<string | null>(donation?.screenshotUrl || null);
  const screenshotFile = watch('screenshotFile');
  const donationTypeValue = watch('donationType');

  useEffect(() => {
    const fileList = screenshotFile as FileList | undefined;
    if (fileList && fileList.length > 0) {
        setScannedText('');
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

  const handleScanToText = async () => {
    const fileList = getValues('screenshotFile') as FileList | undefined;
    const existingImageUrl = donation?.screenshotUrl;

    if (!fileList?.length && !existingImageUrl) {
        toast({
            title: "No Image to Scan",
            description: "Please upload a screenshot first.",
            variant: "destructive",
        });
        return;
    }
    setIsScanning(true);
    setScannedText('');
    toast({ title: "Scanning...", description: "Uploading and extracting text from the screenshot." });

    let imageUrlToScan: string | null = null;
    let tempFileRef: StorageReference | null = null;

    try {
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            const tempPath = `temp-scans/${Date.now()}-${file.name}`;
            tempFileRef = storageRef(storage!, tempPath);
            await uploadBytes(tempFileRef, file);
            imageUrlToScan = await getDownloadURL(tempFileRef);
        } else if (existingImageUrl) {
            imageUrlToScan = existingImageUrl;
        }

        if (!imageUrlToScan) {
            throw new Error("Could not get a file URL to scan.");
        }

        const response = await extractAndCorrectText({ photoDataUri: imageUrlToScan });
        if (!response.extractedText) {
          throw new Error("The AI model failed to extract any text from the document.");
        }
        setScannedText(response.extractedText);
        toast({
            title: "Text Extracted",
            description: "Raw text is now available. Click 'Autofill From Text' to populate the form.",
            variant: "success",
        });
    } catch (error: any) {
        console.warn("Scan to text failed:", error);
        toast({
            title: "Scan Failed",
            description: error.message || "Could not automatically read the screenshot.",
            variant: "destructive",
        });
    } finally {
        if (tempFileRef) {
            await deleteObject(tempFileRef).catch(err => console.error("Failed to delete temp file", err));
        }
        setIsScanning(false);
    }
  };
  
  const handleAutofillFromText = async () => {
    if (!scannedText) {
        toast({
            title: "No Text to Process",
            description: "Please scan an image first to extract text.",
            variant: "destructive",
        });
        return;
    }
    setIsAutofilling(true);
    toast({ title: "Autofilling...", description: "Parsing text and filling form fields." });
    try {
        const response = await extractPaymentDetails({ text: scannedText });
        
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
                description: "Could not find any details to autofill from the text.",
                variant: "default",
            });
        }

    } catch (error: any) {
         console.warn("Autofill from text failed:", error);
         toast({
            title: "Autofill Failed",
            description: error.message || "Could not parse details from the text.",
            variant: "destructive",
        });
    } finally {
        setIsAutofilling(false);
    }
  };
  
  const handleFormSubmit = async (data: DonationFormData) => {
    if (!storage) return;

    const oldScreenshotUrl = donation?.screenshotUrl;
    let newScreenshotUrl = oldScreenshotUrl || '';
    
    const { screenshotFile, ...donationData } = data;

    try {
        const fileList = screenshotFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            const uploadPromise = new Promise<string>(async (resolve) => {
                const { default: Resizer } = await import('react-image-file-resizer');
                Resizer.imageFileResizer(
                    file, 1024, 1024, 'JPEG', 80, 0,
                    uri => resolve(uri as string),
                    'base64'
                );
            });
            const resizedDataUri = await uploadPromise;
            const blob = await (await fetch(resizedDataUri)).blob();

            toast({
                title: "Uploading Screenshot...",
                description: `Please wait while '${file.name}' is uploaded.`,
            });
            
            const transactionIdPart = data.transactionId || 'NULL';
            const fileNameParts = [ data.donorName, data.donorPhone, data.donationDate, transactionIdPart ];
            const sanitizedBaseName = fileNameParts.join('_').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_{2,}/g, '_');
            const fileExtension = 'jpeg';
            const finalFileName = `${sanitizedBaseName}.${fileExtension}`;
            
            const filePath = `donations/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, blob);
            newScreenshotUrl = await getDownloadURL(uploadResult.ref);

            if (oldScreenshotUrl && oldScreenshotUrl !== newScreenshotUrl) {
                try {
                    await deleteObject(storageRef(storage, oldScreenshotUrl));
                } catch (deleteError: any) {
                    if (deleteError.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old screenshot file:", deleteError);
                    }
                }
            }
        }
        
        onSubmit({
          ...donationData,
          screenshotUrl: newScreenshotUrl,
        } as DonationFormData);

    } catch (error: any) {
        console.warn("Error during file upload:", error);
        toast({ title: 'Error', description: `Could not save donation screenshot. ${error.message}`, variant: 'destructive' });
    }
  };


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
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
                          onClick={handleScanToText}
                          disabled={isScanning || isAutofilling}
                      >
                          {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                          Scan Screenshot to Text
                      </Button>
                  )}
                   {scannedText && (
                        <div className="space-y-2">
                             <Label htmlFor="scanned-text">Extracted Text</Label>
                             <Textarea
                                id="scanned-text"
                                placeholder="Raw text from the image will appear here..."
                                value={scannedText}
                                onChange={(e) => setScannedText(e.target.value)}
                                rows={6}
                                className="font-code"
                             />
                             <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={handleAutofillFromText}
                                disabled={isScanning || isAutofilling}
                             >
                                 {isAutofilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                                 Autofill Form from Text
                             </Button>
                        </div>
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
    </>
  );
}

