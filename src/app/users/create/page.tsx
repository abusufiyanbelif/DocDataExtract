'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError, useStorage, useCollection, useUserProfile } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import { modules, permissions } from '@/lib/modules';

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
  
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const usersCollectionRef = useMemo(() => {
    if (!firestore || isProfileLoading) return null;
    return collection(firestore, 'users');
  }, [firestore, isProfileLoading]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);
  
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.create;

  const handleSave = async (data: UserFormData) => {
    if (!firestore || !storage || !canCreate) {
        toast({ title: 'Error', description: 'You do not have permission or services are unavailable.', variant: 'destructive' });
        return;
    };
    setIsSubmitting(true);
    
    if (users.some(u => u.loginId === data.loginId)) {
        toast({
            title: 'Login ID Exists',
            description: 'This Login ID is already taken. Please choose another one.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }
    
    const { password, _isEditing, idProofFile, ...userData } = data;

    if (userData.role === 'Admin') {
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
        userData.permissions = allPermissions;
    }

    let idProofUrl = '';
    const email = `${data.userKey}@docdataextract.app`;
    const newPassword = data.password!;

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, newPassword);
        const newUid = userCredential.user.uid;
        
        try {
            const fileList = idProofFile as FileList | undefined;
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
        } catch (uploadError) {
             console.error("Error during file upload:", uploadError);
             toast({ title: 'File Upload Error', description: 'Could not upload ID proof. User created without it.', variant: 'destructive' });
        }
        
        const finalData = { ...userData, idProofUrl, createdAt: serverTimestamp() };
        const batch = writeBatch(firestore);

        // 1. Set the main user document with UID as the doc ID
        const docRef = doc(firestore, 'users', newUid);
        batch.set(docRef, finalData);

        // 2. Create the lookup document for the loginId
        const loginIdLookupRef = doc(firestore, 'user_lookups', data.loginId);
        batch.set(loginIdLookupRef, { userKey: data.userKey });

        // 3. Create the lookup document for the phone number
        if (data.phone) {
            const phoneLookupRef = doc(firestore, 'user_lookups', data.phone);
            batch.set(phoneLookupRef, { userKey: data.userKey });
        }
        
        await batch.commit()
            .then(() => {
                toast({ title: 'Success', description: `User '${data.name}' created successfully.` });
                router.push('/users');
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: 'users collection and user_lookups',
                    operation: 'create',
                    requestResourceData: finalData,
                });
                errorEmitter.emit('permission-error', permissionError);
                console.error("Firestore write failed, but Auth user was created. Manual cleanup may be required for user:", email);
                toast({ title: 'Database Error', description: 'User could not be saved to the database due to permissions. The auth account was created but is orphaned.', variant: 'destructive', duration: 10000 });
            });

    } catch (error: any) {
        let errorMessage = "An unexpected error occurred during user creation.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "This user key is already associated with an authentication account. This can happen if a user with this key was deleted from Firestore but not from Firebase Auth.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "The password is too weak. Please use at least 6 characters.";
                    break;
                default:
                    errorMessage = error.message;
                    break;
            }
        }
        toast({ title: 'User Creation Failed', description: errorMessage, variant: 'destructive' });
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
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
                onSubmit={handleSave}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
