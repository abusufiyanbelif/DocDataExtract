'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters.'),
  status: z.enum(['Upcoming', 'Active', 'Completed']),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      status: 'Upcoming',
    },
  });

  const onSubmit = async (data: CampaignFormValues) => {
    if (!firestore) {
      toast({ title: 'Error', description: 'Firestore is not available.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(firestore, 'campaigns'), {
        ...data,
        createdAt: serverTimestamp(),
        priceDate: new Date().toISOString().split('T')[0],
        shopName: '',
        shopContact: '',
        shopAddress: '',
        rationLists: {
          'General': [],
        },
      });
      toast({ title: 'Success', description: 'Campaign created successfully.' });
      router.push(`/campaign/${docRef.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({ title: 'Error', description: 'Could not create campaign.', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link href="/campaign">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Link>
          </Button>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ration Kit Distribution Ramza 2027" {...field} />
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
                          <SelectItem value="Upcoming">Upcoming</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Campaign
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
