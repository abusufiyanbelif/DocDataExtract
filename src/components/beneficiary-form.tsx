
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
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
import type { Beneficiary, RationList, RationItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2, ScanLine, Trash2, Replace, FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractKeyInfoFromAadhaar } from '@/ai/flows/extract-key-info-identity';
import { useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type StorageReference } from 'firebase/storage';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().optional(),
  phone: z.string().length(10, { message: "Phone must be exactly 10 digits." }).optional().or(z.literal('')),
  members: z.coerce.number().int().optional(),
  earningMembers: z.coerce.number().int().optional(),
  male: z.coerce.number().int().optional(),
  female: z.coerce.number().int().optional(),
  idProofType: z.string().optional(),
  idNumber: z.string().optional(),
  referralBy: z.string().min(2, { message: "Referral is required." }),
  kitAmount: z.coerce.number().min(0),
  status: z.enum(['Given', 'Pending', 'Hold', 'Need More Details', 'Verified']),
  idProofFile: z.any().optional(),
  idProofDeleted: z.boolean().optional(),
});

export type BeneficiaryFormData = z.infer<typeof formSchema>;

interface BeneficiaryFormProps {
  beneficiary?: Beneficiary | null;
  onSubmit: (data: BeneficiaryFormData) => void;
  onCancel: () => void;
  rationLists: RationList;
}

export function BeneficiaryForm({ beneficiary, onSubmit, onCancel, rationLists }: BeneficiaryFormProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const storage = useStorage();

  const form = useForm<BeneficiaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: beneficiary?.name || '',
      address: beneficiary?.address || '',
      phone: beneficiary?.phone || '',
      members: beneficiary?.members || 1,
      earningMembers: beneficiary?.earningMembers || 0,
      male: beneficiary?.male || 0,
      female: beneficiary?.female || 0,
      idProofType: beneficiary?.idProofType || '',
      idNumber: beneficiary?.idNumber || '',
      referralBy: beneficiary?.referralBy || '',
      kitAmount: beneficiary?.kitAmount || 0,
      status: beneficiary?.status || 'Pending',
      idProofDeleted: false,
    },
  });

  const { formState: { isSubmitting }, watch, setValue, register, getValues } = form;
  const [preview, setPreview] = useState<string | null>(beneficiary?.idProofUrl || null);
  const idProofFile = watch('idProofFile');

  const membersValue = watch('members');

  useEffect(() => {
    const fileList = idProofFile as FileList | undefined;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue('idProofDeleted', false);
    } else if (!watch('idProofDeleted')) {
        setPreview(beneficiary?.idProofUrl || null);
    } else {
        setPreview(null);
    }
  }, [idProofFile, beneficiary?.idProofUrl, watch]);

  useEffect(() => {
    const calculateTotal = (items: RationItem[]) => items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    
    let total = 0;
    if (membersValue && membersValue > 0) {
        const memberCountStr = String(membersValue);
        const exactMatchList = rationLists[memberCountStr];

        const generalListKey = Object.keys(rationLists).find(k => k.toLowerCase().includes('general'));
        const generalList = generalListKey ? rationLists[generalListKey] : undefined;
        
        const listToUse = exactMatchList || generalList;

        if (listToUse) {
            total = calculateTotal(listToUse);
        }
    }
    setValue('kitAmount', total, { shouldValidate: true });
    
  }, [membersValue, rationLists, setValue]);
  
  const isKitAmountReadOnly = useMemo(() => {
    if (membersValue && membersValue > 0) {
        const memberCountStr = String(membersValue);
        const hasExactMatch = !!rationLists[memberCountStr];

        const generalListKey = Object.keys(rationLists).find(k => k.toLowerCase().includes('general'));
        const hasGeneralFallback = !!(generalListKey && rationLists[generalListKey]);
        
        return hasExactMatch || hasGeneralFallback;
    }
    return false;
  }, [membersValue, rationLists]);

  const handleDeleteProof = () => {
    setValue('idProofFile', null);
    setValue('idProofDeleted', true);
    setPreview(null);
    toast({ title: 'Image Marked for Deletion', description: 'The ID proof will be permanently deleted when you save the changes.', variant: 'default' });
  };
  
  const handleScanIdProof = async () => {
    const fileList = getValues('idProofFile') as FileList | undefined;
    const existingImageUrl = beneficiary?.idProofUrl;

    if (!fileList?.length && !existingImageUrl) {
        toast({
            title: "No Image to Scan",
            description: "Please upload an ID proof document first.",
            variant: "destructive",
        });
        return;
    }

    setIsScanning(true);
    let imageUrlToScan: string | null = null;
    let tempFileRef: StorageReference | null = null;

    try {
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            toast({ title: "Preparing file...", description: "Uploading for secure analysis." });
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

        toast({ title: "Scanning document...", description: "Please wait while the AI analyzes the image." });
        const response = await extractKeyInfoFromAadhaar({ photoDataUri: imageUrlToScan });

        if (response) {
            if (response.name) setValue('name', response.name, { shouldValidate: true });
            if (response.address) setValue('address', response.address, { shouldValidate: true });
            if (response.aadhaarNumber) setValue('idNumber', response.aadhaarNumber, { shouldValidate:true });
            setValue('idProofType', 'Aadhaar', { shouldValidate: true });
            
            toast({
                title: "Scan Successful",
                description: "Beneficiary details have been populated from the ID proof.",
                variant: "success",
            });
        } else {
             toast({
                title: "Scan Incomplete",
                description: "Could not extract all details from the image. Please fill them manually.",
                variant: "default",
            });
        }
    } catch (error: any) {
        console.warn("ID Proof scan failed:", error);
        toast({
            title: "Scan Failed",
            description: error.message || "Could not automatically read the document. Please enter the details manually.",
            variant: "destructive",
        });
    } finally {
        if (tempFileRef) {
            await deleteObject(tempFileRef).catch(err => console.error("Failed to delete temp file", err));
        }
        setIsScanning(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Saleem Khan" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="10-digit mobile number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                    <Input placeholder="Full residential address" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField
            control={form.control}
            name="members"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Members</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="earningMembers"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Earning</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="male"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Male</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="female"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Female</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormItem>
            <FormLabel>ID Proof Document</FormLabel>
            <div className="flex items-center gap-2">
                <FormControl className="flex-grow">
                    <Input id="id-proof-file-input" type="file" accept="image/*,application/pdf" {...register('idProofFile')} />
                </FormControl>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleScanIdProof} 
                    disabled={isScanning || !preview}
                    title="Scan ID Proof from Image"
                >
                    {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                    Scan
                </Button>
            </div>
            <FormDescription>Optional. Upload an image or PDF of the ID proof. You can scan it after uploading.</FormDescription>
            <FormMessage />
        </FormItem>
        
        {preview && (
            <div className="relative group w-full h-48 mt-2 rounded-md overflow-hidden border">
                 {preview.startsWith('data:application/pdf') ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                        <FileIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm text-center">PDF Document Uploaded</p>
                    </div>
                 ) : (
                    <Image src={preview} alt="ID Proof Preview" fill style={{ objectFit: 'contain' }} />
                 )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button type="button" size="icon" variant="outline" onClick={() => document.getElementById('id-proof-file-input')?.click()}>
                        <Replace className="h-5 w-5"/>
                        <span className="sr-only">Replace Image</span>
                    </Button>
                     <Button type="button" size="icon" variant="destructive" onClick={handleDeleteProof}>
                        <Trash2 className="h-5 w-5"/>
                        <span className="sr-only">Delete Image</span>
                    </Button>
                 </div>
            </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="idProofType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>ID Proof Type</FormLabel>
                <FormControl>
                    <Input placeholder="Aadhaar, PAN, etc." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="idNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>ID Number</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. XXXX XXXX 1234" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="referralBy"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Referred By *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Local NGO" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="kitAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kit Amount (Rupee) *</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder="Auto-calculated or enter manually"
                            {...field}
                            readOnly={isKitAmountReadOnly}
                            className={cn(isKitAmountReadOnly && "bg-muted/50 focus:ring-0 cursor-not-allowed")}
                         />
                    </FormControl>
                     <FormDescription>
                        This is auto-calculated if a ration list exists for the number of members.
                    </FormDescription>
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
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Given">Given</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Hold">Hold</SelectItem>
                    <SelectItem value="Need More Details">Need More Details</SelectItem>
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
                {isSubmitting ? 'Saving...' : 'Save Beneficiary'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

    
