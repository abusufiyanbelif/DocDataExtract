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
import type { Beneficiary, RationList, RationItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address is required." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits." }),
  members: z.coerce.number().int().min(1, { message: "Must have at least 1 member." }),
  earningMembers: z.coerce.number().int().min(0, { message: "Cannot be negative." }),
  male: z.coerce.number().int().min(0, { message: "Cannot be negative." }),
  female: z.coerce.number().int().min(0, { message: "Cannot be negative." }),
  idProofType: z.string().min(3, { message: "ID proof type is required." }),
  idNumber: z.string().min(3, { message: "ID number is required." }),
  referralBy: z.string().min(2, { message: "Referral is required." }),
  kitAmount: z.coerce.number().min(0, { message: "Amount cannot be negative."}),
  status: z.enum(['Given', 'Pending', 'Hold', 'Need More Details']),
  idProofFile: z.instanceof(File).optional(),
});

export type BeneficiaryFormData = z.infer<typeof formSchema>;

interface BeneficiaryFormProps {
  beneficiary?: Beneficiary | null;
  onSubmit: (data: BeneficiaryFormData) => void;
  onCancel: () => void;
  rationLists: RationList;
}

export function BeneficiaryForm({ beneficiary, onSubmit, onCancel, rationLists }: BeneficiaryFormProps) {
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
    },
  });

  const { formState: { isSubmitting }, watch, setValue, register } = form;
  const [preview, setPreview] = useState<string | null>(beneficiary?.idProofUrl || null);
  const idProofFile = watch('idProofFile');

  const membersValue = watch('members');

  useEffect(() => {
    if (idProofFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(idProofFile);
    } else if (beneficiary?.idProofUrl) {
      setPreview(beneficiary.idProofUrl);
    } else {
        setPreview(null);
    }
  }, [idProofFile, beneficiary?.idProofUrl]);

  useEffect(() => {
    const calculateTotal = (items: RationItem[]) => items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    
    if (membersValue > 0) {
        const memberCountStr = String(membersValue);
        let listToUse = rationLists[memberCountStr];

        if (!listToUse && membersValue >= 5 && rationLists['General']) {
            listToUse = rationLists['General'];
        }

        if (listToUse) {
            const total = calculateTotal(listToUse);
            setValue('kitAmount', total, { shouldValidate: true });
        }
    }
  }, [membersValue, rationLists, setValue]);

  const isKitAmountReadOnly = !!rationLists[String(membersValue)] || (membersValue >= 5 && !!rationLists['General']);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="referralBy"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Referred By</FormLabel>
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
                    <FormLabel>Kit Amount (₹)</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder="Auto-calculated or enter manually"
                            {...field}
                            readOnly={isKitAmountReadOnly}
                            className={cn(isKitAmountReadOnly && "bg-muted/50 focus:ring-0 cursor-not-allowed")}
                         />
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
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Given">Given</SelectItem>
                    <SelectItem value="Hold">Hold</SelectItem>
                    <SelectItem value="Need More Details">Need More Details</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormItem>
            <FormLabel>ID Proof Document</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" {...register('idProofFile')} />
            </FormControl>
            <FormDescription>Optional. Upload an image of the ID proof.</FormDescription>
            <FormMessage />
        </FormItem>
        
        {preview && (
            <div className="relative w-full h-48 mt-2 rounded-md overflow-hidden border">
                <Image src={preview} alt="ID Proof Preview" fill style={{ objectFit: 'contain' }} />
            </div>
        )}

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
