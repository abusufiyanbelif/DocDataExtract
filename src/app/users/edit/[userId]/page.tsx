'use client';
import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, useStorage } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateDoc, doc, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { modules, createAdminPermissions } from '@/lib/modules';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile: currentUserProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const userDocRef = useMemo(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const canUpdate = currentUserProfile?.role === 'Admin' || !!currentUserProfile?.permissions?.users?.update;

  const handleSave = async (data: UserFormData) => {
    if (!firestore || !storage || !user || !canUpdate) {
        toast({ title: 'Error', description: 'You do not have permission or services are unavailable.', variant: 'destructive' });
        return;
    };
    setIsSubmitting(true);

    const permissionsToSave = data.role === 'Admin' ? createAdminPermissions() : data.permissions;

    let idProofUrl = user?.idProofUrl || '';
    try {
        const fileList = data.idProofFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            toast({
                title: "Uploading ID Proof...",
                description: `Please wait while '${file.name}' is uploaded.`,
            });
            
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const finalFileName = `${userId}_id_proof.${fileExtension}`;
            const filePath = `users/${userId}/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, file);
            idProofUrl = await getDownloadURL(uploadResult.ref);
        }
    } catch (uploadError) {
         console.error("Error during file upload:", uploadError);
         toast({ title: 'File Upload Error', description: 'Could not upload ID proof file. Other details were not saved.', variant: 'destructive' });
         setIsSubmitting(false);
         return;
    }

    const updateData = {
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        permissions: permissionsToSave,
        idProofType: data.idProofType,
        idNumber: data.idNumber,
        idProofUrl,
    };
    
    const docRef = doc(firestore, 'users', userId);
    const batch = writeBatch(firestore);
    batch.update(docRef, updateData as any);
    
    // Handle phone number lookup update if it changed
    if (user && user.phone !== data.phone) {
        // Delete old lookup if it existed
        if (user.phone) {
            const oldPhoneLookupRef = doc(firestore, 'user_lookups', user.phone);
            batch.delete(oldPhoneLookupRef);
        }
        // Create new lookup if new phone exists
        if (data.phone) {
            const newPhoneLookupRef = doc(firestore, 'user_lookups', data.phone);
            batch.set(newPhoneLookupRef, { userKey: user.userKey });
        }
    }

    batch.commit()
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

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
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
