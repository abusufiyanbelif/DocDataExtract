
'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError, useStorage, useCollection } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import { modules, createAdminPermissions } from '@/lib/modules';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function CreateUserPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { userProfile, isLoading: isProfileLoading } = useSession();

  const usersCollectionRef = useMemo(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'users');
  }, [firestore, userProfile?.id]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);
  
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.create;

  const handleSave = async (data: UserFormData) => {
    if (!firestore || !storage || !canCreate || !userProfile) {
        toast({ title: 'Error', description: 'You do not have permission or services are unavailable.', variant: 'destructive' });
        return;
    };
    setIsSubmitting(true);
    
    let email = data.email;
    if (!email && data.phone) {
        email = `+${data.phone}@docdataextract.app`;
    }

    if (!email) {
        toast({ title: 'Validation Error', description: 'Either an email or phone number is required to create a user.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    if (users && users.some(u => u.loginId === data.loginId || u.userKey === data.userKey || u.email === email)) {
        toast({
            title: 'ID Exists',
            description: 'This Login ID, User Key, or Email/Phone is already taken. Please choose another one.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    const newPassword = data.password!;

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, newPassword);
        const newUid = userCredential.user.uid;
        
        let idProofUrl = '';
        try {
            const fileList = data.idProofFile as FileList | undefined;
            if (fileList && fileList.length > 0) {
                const file = fileList[0];
                toast({
                    title: "Uploading ID Proof...",
                    description: `Please wait while '${file.name}' is uploaded.`,
                });
                
                const fileExtension = file.name.split('.').pop() || 'jpg';
                const finalFileName = `${newUid}_id_proof.${fileExtension}`;
                const filePath = `users/${newUid}/${finalFileName}`;
                const fileRef = storageRef(storage, filePath);

                const uploadResult = await uploadBytes(fileRef, file);
                idProofUrl = await getDownloadURL(uploadResult.ref);
            }
        } catch (uploadError: any) {
             throw new Error(`File upload failed: ${uploadError.message}. User creation has been cancelled. The temporary authentication account will be removed, but if that fails, manual cleanup may be required.`);
        }
        
        const permissionsToSave = data.role === 'Admin' ? createAdminPermissions() : data.permissions;
        const dataToSave: Omit<UserProfile, 'id'> & { createdAt: any } = {
            name: data.name,
            email: email, // Use real or synthetic email
            phone: data.phone,
            loginId: data.loginId,
            userKey: data.userKey,
            role: data.role,
            status: data.status,
            permissions: permissionsToSave,
            idProofType: data.idProofType,
            idNumber: data.idNumber,
            idProofUrl,
            createdAt: serverTimestamp(),
            createdById: userProfile.id,
            createdByName: userProfile.name,
        };

        const batch = writeBatch(firestore);
        const docRef = doc(firestore, 'users', newUid);
        batch.set(docRef, dataToSave);

        const loginIdLookupRef = doc(firestore, 'user_lookups', data.loginId);
        batch.set(loginIdLookupRef, { email: email, userKey: data.userKey });

        if (data.phone) {
            const phoneLookupRef = doc(firestore, 'user_lookups', data.phone);
            batch.set(phoneLookupRef, { email: email, userKey: data.userKey });
        }
        
        if (data.userKey) {
            const userKeyLookupRef = doc(firestore, 'user_lookups', data.userKey);
            batch.set(userKeyLookupRef, { email: email, userKey: data.userKey });
        }
        
        await batch.commit();

        toast({ title: 'Success', description: `User '${data.name}' created successfully.`, variant: 'success' });
        router.push('/users');

    } catch (error: any) {
        let errorMessage = "An unexpected error occurred during user creation.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "This email is already in use. Each user must have a unique email address.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "The password is too weak. Please use at least 6 characters.";
                    break;
                default:
                    errorMessage = error.message;
                    break;
            }
        } else {
             errorMessage = error.message;
        }

        if (error.name === 'FirestorePermissionError' || error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'users collection and user_lookups',
                operation: 'create',
            });
            errorEmitter.emit('permission-error', permissionError);
            errorMessage = 'User could not be saved to the database due to permissions. The auth account was created but is orphaned. Manual cleanup may be required.';
        }


        toast({ title: 'User Creation Failed', description: errorMessage, variant: 'destructive', duration: 10000 });
    } finally {
        await deleteApp(tempApp);
        setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  const isLoading = areUsersLoading || isProfileLoading;
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!canCreate) {
      return (
        <div className="min-h-screen text-foreground">
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
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have the required permissions to create a new user.
                    </AlertDescription>
                </Alert>
            </main>
        </div>
    )
  }

  return (
    <div className="min-h-screen text-foreground">
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
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
                onSubmit={handleSave}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                isLoading={isLoading}
                isReadOnly={false}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
