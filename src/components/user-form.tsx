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
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { modules, permissions } from '@/lib/modules';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Loader2 } from 'lucide-react';

const permissionsSchema = z.record(z.string(), z.record(z.string(), z.boolean()).optional()).optional();

const baseSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits." }),
  loginId: z.string().min(3, { message: "Login ID must be at least 3 characters." }).regex(/^[a-z0-9_.]+$/, { message: 'Login ID can only contain lowercase letters, numbers, underscores, and periods.' }),
  userKey: z.string().min(1, { message: 'User Key is required.'}),
  role: z.enum(['Admin', 'User']),
  status: z.enum(['Active', 'Inactive']),
  permissions: permissionsSchema,
});

const createUserSchema = baseSchema.extend({
  password: z.string().min(6, { message: 'Password is required and must be at least 6 characters.' }),
});

const editUserSchema = baseSchema.extend({
    password: z.string().optional().refine(val => !val || val.length >= 6, {
        message: 'If changing, the password must be at least 6 characters.',
    }),
});

export type UserFormData = z.infer<typeof createUserSchema>;

interface UserFormProps {
  user?: UserProfile | null;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isLoading: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isSubmitting, isLoading }: UserFormProps) {
  const isEditing = !!user;
  const isDefaultAdmin = user?.userKey === 'admin';
  const { toast } = useToast();
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(isEditing ? editUserSchema : createUserSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      userKey: user?.userKey || 'user_' + Date.now(),
      loginId: user?.loginId || '',
      role: user?.role || 'User',
      status: user?.status || 'Active',
      password: '',
      permissions: user?.permissions || {},
    },
  });

  const { watch, setValue } = form;
  const nameValue = watch('name');
  const roleValue = watch('role');
  
  useEffect(() => {
    if (!isEditing && nameValue) {
        const generatedId = nameValue.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        setValue('loginId', generatedId, { shouldValidate: true });
    }
  }, [nameValue, isEditing, setValue]);
  
  useEffect(() => {
    if (roleValue === 'Admin') {
        const allPermissions: any = {};
        for (const mod of modules) {
            allPermissions[mod.id] = {};
            for (const perm of permissions) {
                allPermissions[mod.id][perm] = true;
            }
        }
        setValue('permissions', allPermissions);
    }
  }, [roleValue, setValue]);

  const handleFeatureNotReady = (featureName: string) => {
    toast({
        title: 'Coming Soon!',
        description: `${featureName} functionality will be implemented in a future update.`,
    });
  }
  
  const isFormDisabled = isSubmitting || isLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Moosa Shaikh" {...field} disabled={isFormDisabled} />
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
                    <Input placeholder="10-digit mobile number" {...field} disabled={isFormDisabled} />
                </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="loginId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Login ID</FormLabel>
                <FormControl>
                    <Input placeholder="auto-generated from name" {...field} readOnly={isEditing} disabled={isFormDisabled || isEditing} />
                </FormControl>
                <FormDescription>Used for signing in. Cannot be changed after creation.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="userKey"
            render={({ field }) => (
                <FormItem>
                <FormLabel>User Key (System ID)</FormLabel>
                <FormControl>
                    <Input placeholder="System-generated" {...field} readOnly disabled={isFormDisabled} />
                </FormControl>
                <FormDescription>This is a system-generated unique ID. It cannot be changed.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input type="password" placeholder={isEditing ? "Leave blank to keep current" : "Minimum 6 characters"} {...field} value={field.value ?? ''} disabled={isFormDisabled} />
                </FormControl>
                <Button type="button" variant="outline" onClick={() => handleFeatureNotReady('Password Reset')} disabled>Reset</Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isDefaultAdmin || isFormDisabled}>
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
                <FormDescription>
                    {isDefaultAdmin ? 'The default admin role cannot be changed.' : "'Admin' has all permissions."}
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
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isDefaultAdmin || isFormDisabled}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <FormDescription>
                    Inactive users cannot log in.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="space-y-2">
            <FormLabel>Module Permissions</FormLabel>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[150px]">Module</TableHead>
                    {permissions.map((perm) => (
                        <TableHead key={perm} className="text-center capitalize">{perm}</TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {modules.map((mod) => (
                    <TableRow key={mod.id}>
                        <TableCell className="font-medium">{mod.name}</TableCell>
                        {permissions.map((perm) => (
                        <TableCell key={perm} className="text-center">
                            <FormField
                            control={form.control}
                            name={`permissions.${mod.id}.${perm}`}
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-center p-0 m-0 space-y-0">
                                <FormControl>
                                    <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={roleValue === 'Admin' || isFormDisabled}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        ))}
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isFormDisabled}>Cancel</Button>
          <Button type="submit" disabled={isFormDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
