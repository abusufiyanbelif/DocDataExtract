'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { UserProfile } from '@/lib/types';
import { modules, permissions } from '@/lib/modules';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';

export default function CreateUserPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersCollectionRef = collection(firestore!, 'users');
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const handleSave = async (data: UserFormData) => {
    if (!firestore) {
        toast({ title: 'Error', description: 'Database connection not available.', variant: 'destructive' });
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

    const finalData = { ...userData, createdAt: serverTimestamp() };
    const email = `${data.userKey}@docdataextract.app`;
    const newPassword = data.password!;

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        await createUserWithEmailAndPassword(tempAuth, email, newPassword);
        await addDoc(collection(firestore, 'users'), finalData);
        
        toast({ title: 'Success', description: `User '${data.name}' created successfully.` });
        router.push('/users');
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
                isLoading={areUsersLoading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
