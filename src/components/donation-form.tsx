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
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  donorName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  donorPhone: z.string().length(10, { message: "Phone must be exactly 10 digits." }).optional().or(z.literal('')),
  referral: z.string().min(1, { message: "Referral is required." }),
  amount: z.coerce.number().min(1, { message: "Amount must be at least 1." }),
  type: z.enum(['Zakat', 'Sadqa', 'Interest', 'Lillah', 'General']),
  paymentType: z.enum(['Cash', 'Online']),
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
  const form = useForm<DonationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      donorName: donation?.donorName || '',
      donorPhone: donation?.donorPhone || '',
      referral: donation?.referral || '',
      amount: donation?.amount || 0,
      type: donation?.type || 'General',
      paymentType: donation?.paymentType || 'Online',
      donationDate: donation?.donationDate || new Date().toISOString().split('T')[0],
      status: donation?.status || 'Pending',
    },
  });

  const { formState: { isSubmitting }, register, watch } = form;
  const [preview, setPreview] = useState<string | null>(donation?.screenshotUrl || null);
  const screenshotFile = watch('screenshotFile');

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="donorName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Donor Name</FormLabel>
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
        <FormField
            control={form.control}
            name="referral"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Referral</FormLabel>
                <FormControl>
                    <Input placeholder="Referred by..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
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
                    <FormLabel>Type</FormLabel>
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
            <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="donationDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Donation Date</FormLabel>
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
                    <FormLabel>Status</FormLabel>
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

        <FormItem>
            <FormLabel>Screenshot</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" {...register('screenshotFile')} />
            </FormControl>
            <FormDescription>
                Optional. Upload a screenshot of the donation transaction.
            </FormDescription>
            <FormMessage />
        </FormItem>

        {preview && (
            <div className="relative w-full h-48 mt-2 rounded-md overflow-hidden border">
                <Image src={preview} alt="Donation screenshot preview" fill style={{ objectFit: 'contain' }} />
            </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save Donation'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
