'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import type { User } from '@/app/users/page';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits." }),
  userKey: z.string().min(3, { message: "User Key must be at least 3 characters." }).regex(/^[a-z0-9_]+$/, { message: 'User Key can only contain lowercase letters, numbers, and underscores.' }),
  role: z.enum(['Admin', 'User']),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }).optional().or(z.literal('')),
});

export type UserFormData = z.infer<typeof formSchema>;

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const isEditing = !!user;
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      userKey: user?.userKey || '',
      role: user?.role || 'User',
      password: '',
    },
  });

  const { formState: { isSubmitting }, watch, setValue } = form;
  const nameValue = watch('name');

  useEffect(() => {
    if (!isEditing && nameValue) {
        const generatedKey = nameValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        setValue('userKey', generatedKey, { shouldValidate: true });
    }
  }, [nameValue, isEditing, setValue]);
  
  const handleFeatureNotReady = (featureName: string) => {
    toast({
        title: 'Coming Soon!',
        description: `${featureName} functionality will be implemented in a future update.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Moosa Shaikh" {...field} />
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
              <div className="flex gap-2">
                <FormControl>
                    <Input placeholder="10-digit mobile number" {...field} />
                </FormControl>
                <Button type="button" variant="outline" onClick={() => handleFeatureNotReady('Change Phone Number')} disabled>Change</Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Key</FormLabel>
              <FormControl>
                <Input placeholder="auto-generated from name" {...field} readOnly={!isEditing} />
              </FormControl>
              <FormDescription>A unique key for the user. Cannot be changed after creation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input type="password" placeholder={isEditing ? "Leave blank to keep current" : "Minimum 6 characters"} {...field} />
                </FormControl>
                <Button type="button" variant="outline" onClick={() => handleFeatureNotReady('Password Reset')} disabled>Reset</Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
