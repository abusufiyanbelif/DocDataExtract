
'use client';
import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, useStorage } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateDoc, doc, writeBatch, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { createAdminPermissions } from '@/lib/modules';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
    return doc(firestore, 'users', userId) as DocumentReference<UserProfile>;
  }, [firestore, userId]);

  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const canUpdate = currentUserProfile?.role === 'Admin' || !!currentUserProfile?.permissions?.users?.update;

  const handleSave = async (data: UserFormData) => {
    if (!firestore || !storage || !user || !canUpdate) {
        toast({ title: 'Error', description: 'You do not have permission or services are unavailable.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    };
    setIsSubmitting(true);
    
    const permissionsToSave = data.role === 'Admin' ? createAdminPermissions() : data.permissions;

    let idProofUrl = user?.idProofUrl || '';
    try {
        if (data.idProofDeleted && idProofUrl) {
            toast({ title: "Deleting ID Proof...", description: 'Removing the old file from storage.'});
            await deleteObject(storageRef(storage, idProofUrl));
            idProofUrl = '';
        }

        const fileList = data.idProofFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            if (idProofUrl) {
                await deleteObject(storageRef(storage, idProofUrl)).catch(err => {
                    if (err.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old file during replacement:", err);
                    }
                });
            }
            
            const file = fileList[0];
            toast({
                title: "Uploading ID Proof...",
                description: `Please wait while '${file.name}' is uploaded.`,
            });

            const { default: Resizer } = await import('react-image-file-resizer');
            const resizedBlob = await new Promise<Blob>((resolve) => {
                 Resizer.imageFileResizer(
                    file, 1024, 1024, 'JPEG', 80, 0,
                    blob => {
                        resolve(blob as Blob);
                    }, 'blob'
                );
            });
            
            const fileExtension = 'jpeg';
            const finalFileName = `${userId}_id_proof.${fileExtension}`;
            const filePath = `users/${userId}/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, resizedBlob);
            idProofUrl = await getDownloadURL(uploadResult.ref);
        }
    } catch (uploadError) {
         console.error("Error during file upload:", uploadError);
         toast({ title: 'File Upload Error', description: 'Could not upload ID proof file. Other details were not saved.', variant: 'destructive' });
         setIsSubmitting(false);
         return;
    }

    const batch = writeBatch(firestore);
    const docRef = doc(firestore, 'users', userId);
    
    const updateData: Partial<UserProfile> = {
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        permissions: permissionsToSave,
        idProofType: data.idProofType,
        idNumber: data.idNumber,
        idProofUrl,
    };
    
    let newEmail = user.email;
    let newLoginId = user.loginId;

    if (currentUserProfile?.role === 'Admin') {
        if (data.email && data.email !== user.email) {
            updateData.email = data.email;
            newEmail = data.email;
        }
        if (data.loginId && data.loginId !== user.loginId) {
            updateData.loginId = data.loginId;
            newLoginId = data.loginId;
        }
    }
    
    batch.update(docRef, updateData as any); // Use any to bypass strict type checking for partial update

    // --- Handle lookup table updates ---

    // 1. Handle Login ID change
    if (user.loginId !== newLoginId) {
        if (user.loginId) batch.delete(doc(firestore, 'user_lookups', user.loginId));
        if (newLoginId) batch.set(doc(firestore, 'user_lookups', newLoginId), { email: newEmail, userKey: user.userKey });
    } else if (user.email !== newEmail && newLoginId) {
        batch.update(doc(firestore, 'user_lookups', newLoginId), { email: newEmail });
    }
    
    // 2. Handle Phone change
    if (user.phone !== data.phone) {
        if (user.phone) batch.delete(doc(firestore, 'user_lookups', user.phone));
        if (data.phone) batch.set(doc(firestore, 'user_lookups', data.phone), { email: newEmail, userKey: user.userKey });
    } else if (user.email !== newEmail && data.phone) {
        batch.update(doc(firestore, 'user_lookups', data.phone), { email: newEmail });
    }

    // 3. Handle User Key lookup (always exists, only email can change)
    if (user.email !== newEmail && user.userKey) {
        batch.update(doc(firestore, 'user_lookups', user.userKey), { email: newEmail });
    }

    try {
        await batch.commit();
        toast({ title: 'Success', description: 'User details have been successfully updated.', variant: 'success' });
        router.push('/users');
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `users/${userId} or associated lookups`,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                title: 'Update Failed',
                description: `An unexpected error occurred: ${serverError.message}`,
                variant: 'destructive',
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  const isLoading = isUserLoading || isProfileLoading;
  const isFormDisabled = isLoading || isSubmitting;

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Edit User: {user.name}</CardTitle>
            </div>
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
