'use client';
import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { modules, permissions } from '@/lib/modules';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const userDocRef = useMemo(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const handleSave = async (data: UserFormData) => {
    if (!firestore) {
        toast({ title: 'Error', description: 'Database connection not available.', variant: 'destructive' });
        return;
    };
    setIsSubmitting(true);
    
    const { password, _isEditing, ...userData } = data;

    if (userData.role === 'Admin') {
        const allPermissions: any = {};
        for (const mod of modules) {
            allPermissions[mod.id] = {};
            for (const perm of permissions) {
                allPermissions[mod.id][perm] = true;
            }
        }
        userData.permissions = allPermissions;
    }

    const docRef = doc(firestore, 'users', userId);
    const { userKey, loginId, ...updateData } = userData;
    
    updateDoc(docRef, updateData as any)
        .then(() => {
            toast({ title: 'Success', description: 'User details have been successfully updated.' });
            router.push('/users');
        })
        .catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const handleCancel = () => {
    router.push('/users');
  };

  if (isUserLoading) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 pt-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
  }

  if (!user) {
     return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/users">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Users
                        </Link>
                    </Button>
                </div>
                 <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>User Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The user you are trying to edit does not exist.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link href="/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Edit User: {user.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
                user={user}
                onSubmit={handleSave}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                isLoading={isUserLoading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
