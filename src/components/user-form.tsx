'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState, useRef } from 'react';
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
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { modules } from '@/lib/modules';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { UserPermissions } from '@/lib/modules';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits." }),
  loginId: z.string().min(3, { message: "Login ID must be at least 3 characters." }).regex(/^[a-z0-9_.]+$/, { message: 'Login ID can only contain lowercase letters, numbers, underscores, and periods.' }),
  userKey: z.string().min(1, { message: 'User Key is required.'}),
  role: z.enum(['Admin', 'User']),
  status: z.enum(['Active', 'Inactive']),
  idProofType: z.string().optional(),
  idNumber: z.string().optional(),
  idProofFile: z.any().optional(),
  permissions: z.any().optional(),
  password: z.string().optional(),
  _isEditing: z.boolean(),
}).superRefine((data, ctx) => {
    if (data._isEditing) {
        if (data.password && data.password.length > 0 && data.password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message: 'If changing, the password must be at least 6 characters.',
            });
        }
    } else {
        if (!data.password || data.password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message: 'Password is required and must be at least 6 characters for new users.',
            });
        }
    }
});


export type UserFormData = z.infer<typeof formSchema>;

interface UserFormProps {
  user?: UserProfile | null;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  isLoading: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isSubmitting, isLoading }: UserFormProps) {
  const isEditing = !!user;
  const isDefaultAdmin = user?.userKey === 'admin';
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      userKey: user?.userKey || 'user_' + Date.now(),
      loginId: user?.loginId || '',
      role: user?.role || 'User',
      status: user?.status || 'Active',
      password: '',
      idProofType: user?.idProofType || '',
      idNumber: user?.idNumber || '',
      permissions: user?.permissions || {},
      _isEditing: isEditing,
    },
  });

  const { watch, setValue, getValues, register } = form;
  const nameValue = watch('name');
  const roleValue = watch('role');
  const idProofFile = watch('idProofFile');
  const prevRoleRef = useRef(roleValue);

  const [preview, setPreview] = useState<string | null>(user?.idProofUrl || null);

  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(
    () => (user && user.role !== 'Admin' ? user.permissions : {})
  );

  useEffect(() => {
    if (!isEditing && nameValue) {
        const generatedId = nameValue.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        setValue('loginId', generatedId, { shouldValidate: true });
    }
  }, [nameValue, isEditing, setValue]);
  
   useEffect(() => {
    // When role changes FROM User TO Admin
    if (roleValue === 'Admin' && prevRoleRef.current === 'User') {
      setUserPermissions(getValues('permissions'));
    }

    // Apply permissions based on the current role
    if (roleValue === 'Admin') {
      const allPermissions: any = {};
      for (const mod of modules) {
        allPermissions[mod.id] = {};
        for (const perm of mod.permissions) {
          allPermissions[mod.id][perm] = true;
        }
        if (mod.subModules) {
          for (const subMod of mod.subModules) {
            allPermissions[mod.id][subMod.id] = {};
            for (const perm of subMod.permissions) {
              allPermissions[mod.id][subMod.id][perm] = true;
            }
          }
        }
      }
      setValue('permissions', allPermissions, { shouldDirty: true });
    } else { // Role is 'User'
      setValue('permissions', userPermissions || {}, { shouldDirty: true });
    }

    // Update the ref for the next render
    prevRoleRef.current = roleValue;
  }, [roleValue, setValue, getValues, userPermissions]);

  useEffect(() => {
    const fileList = idProofFile as FileList | undefined;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (user?.idProofUrl) {
      setPreview(user.idProofUrl);
    } else {
        setPreview(null);
    }
  }, [idProofFile, user?.idProofUrl]);

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
                    <Input placeholder="System-generated" {...field} readOnly disabled={isFormDisabled || isEditing} />
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
                <div className="relative w-full">
                    <FormControl>
                        <Input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder={isEditing ? "Leave blank to keep current" : "Minimum 6 characters"} 
                            {...field} value={field.value ?? ''} 
                            disabled={isFormDisabled} 
                        />
                    </FormControl>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
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
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {modules.map((mod) => (
                        <React.Fragment key={mod.id}>
                            <TableRow>
                                <TableCell className="font-medium">{mod.name}</TableCell>
                                {['create', 'read', 'update', 'delete'].map(perm => (
                                    <TableCell key={perm} className="text-center">
                                        {(mod.permissions as readonly string[]).includes(perm) ? (
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
                                        ) : null}
                                    </TableCell>
                                ))}
                            </TableRow>
                            {mod.subModules?.map(subMod => (
                                <TableRow key={subMod.id}>
                                    <TableCell className="pl-8 text-muted-foreground">{subMod.name}</TableCell>
                                    {['create', 'read', 'update', 'delete'].map(perm => (
                                        <TableCell key={perm} className="text-center">
                                            {(subMod.permissions as readonly string[]).includes(perm) ? (
                                                <FormField
                                                control={form.control}
                                                name={`permissions.${mod.id}.${subMod.id}.${perm}`}
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
                                            ) : null}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </React.Fragment>
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
