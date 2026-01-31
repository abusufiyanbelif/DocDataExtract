
'use client';
import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, useStorage } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateDoc, doc, writeBatch, DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { createAdminPermissions } from '@/lib/modules';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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

    const batch = writeBatch(firestore);
    const docRef = doc(firestore, 'users', userId);

    const oldLoginId = user.loginId;
    const newLoginId = (currentUserProfile?.role === 'Admin' && data.loginId !== oldLoginId) ? data.loginId : oldLoginId;
    
    const oldEmail = user.email;
    const newEmail = (currentUserProfile?.role === 'Admin' && data.email !== oldEmail) ? data.email : oldEmail;

    const oldPhone = user.phone;
    const newPhone = data.phone !== oldPhone ? data.phone : oldPhone;
    
    const updateData: any = {
        name: data.name,
        phone: newPhone,
        role: data.role,
        status: data.status,
        permissions: permissionsToSave,
        idProofType: data.idProofType,
        idNumber: data.idNumber,
        idProofUrl,
    };
    
    if (currentUserProfile?.role === 'Admin') {
        updateData.loginId = newLoginId;
        updateData.email = newEmail;
    }
    
    batch.update(docRef, updateData);

    // --- Handle lookup table updates ---

    // 1. Handle Login ID change
    if (oldLoginId !== newLoginId) {
        if (oldLoginId) batch.delete(doc(firestore, 'user_lookups', oldLoginId));
        if (newLoginId) batch.set(doc(firestore, 'user_lookups', newLoginId), { email: newEmail });
    } else if (oldEmail !== newEmail && newLoginId) {
        // If loginId didn't change but email did, update the existing record
        batch.update(doc(firestore, 'user_lookups', newLoginId), { email: newEmail });
    }
    
    // 2. Handle Phone change
    if (oldPhone !== newPhone) {
        if (oldPhone) batch.delete(doc(firestore, 'user_lookups', oldPhone));
        if (newPhone) batch.set(doc(firestore, 'user_lookups', newPhone), { email: newEmail });
    } else if (oldEmail !== newEmail && newPhone) {
        // If phone didn't change but email did, update the existing record
        batch.update(doc(firestore, 'user_lookups', newPhone), { email: newEmail });
    }

    // 3. Handle User Key lookup (always exists, only email can change)
    if (oldEmail !== newEmail && user.userKey) {
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
