'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, User, Shield, Phone, KeyRound, CheckCircle, XCircle, LogIn, FileText, BadgeInfo, Hash, Eye, Edit, Save, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function ProfileDetail({ icon, label, value, children, isEditing }: { icon: React.ReactNode, label: string, value?: React.ReactNode, children?: React.ReactNode, isEditing?: boolean }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div className="w-full">
                <p className="text-sm text-muted-foreground">{label}</p>
                {isEditing ? children : <div className="font-medium">{value}</div>}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { userProfile, isLoading, refetch } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isEditMode, setIsEditMode] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [imageToView, setImageToView] = useState<string | null>(null);

    const handleViewImage = (url: string) => {
        setImageToView(url);
        setIsImageViewerOpen(true);
    };

    const handleEdit = () => {
        if (userProfile) {
            setName(userProfile.name);
            setPhone(userProfile.phone);
            setIsEditMode(true);
        }
    };

    const handleCancel = () => {
        setIsEditMode(false);
    };

    const handleSave = async () => {
        if (!firestore || !userProfile) {
            toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive'});
            return;
        }

        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, 'users', userProfile.id);

        const updateData: {name?: string, phone?: string} = {};
        if (name !== userProfile.name) updateData.name = name;
        if (phone !== userProfile.phone) updateData.phone = phone;

        if (Object.keys(updateData).length === 0) {
            setIsEditMode(false);
            return;
        }

        batch.update(userDocRef, updateData);

        if (userProfile.phone !== phone) {
            if (userProfile.phone) {
                const oldLookupRef = doc(firestore, 'user_lookups', userProfile.phone);
                batch.delete(oldLookupRef);
            }
            if (phone) {
                const newLookupRef = doc(firestore, 'user_lookups', phone);
                batch.set(newLookupRef, { userKey: userProfile.userKey });
            }
        }
        
        try {
            await batch.commit();
            toast({ title: 'Success', description: 'Profile updated successfully.', variant: 'success' });
            setIsEditMode(false);
            refetch();
        } catch(serverError: any) {
            if (serverError.code === 'permission-denied') {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                }));
            } else {
                toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive'});
            }
        }
    };


    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>My Profile</CardTitle>
                                <CardDescription>This is your personal information as it appears in the system.</CardDescription>
                            </div>
                             {!isEditMode ? (
                                <Button onClick={handleEdit}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                                    <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
                                </div>
                             )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {userProfile ? (
                            <>
                                <ProfileDetail icon={<User />} label="Full Name" value={userProfile.name} isEditing={isEditMode}>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                                </ProfileDetail>
                                <ProfileDetail icon={<Mail />} label="Email Address" value={userProfile.email} />
                                <ProfileDetail icon={<LogIn />} label="Login ID" value={userProfile.loginId} />
                                <ProfileDetail icon={<Phone />} label="Phone Number" value={userProfile.phone} isEditing={isEditMode}>
                                     <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </ProfileDetail>
                                <ProfileDetail icon={<KeyRound />} label="User Key (System ID)" value={userProfile.userKey} />
                                <ProfileDetail icon={<Shield />} label="Role" value={<Badge variant={userProfile.role === 'Admin' ? 'destructive' : 'secondary'}>{userProfile.role}</Badge>} />
                                <ProfileDetail 
                                    icon={userProfile.status === 'Active' ? <CheckCircle className="text-green-500" /> : <XCircle className="text-destructive" />} 
                                    label="Status" 
                                    value={<Badge variant={userProfile.status === 'Active' ? 'default' : 'outline'}>{userProfile.status}</Badge>} 
                                />
                                {userProfile.idProofUrl && (
                                    <ProfileDetail 
                                        icon={<FileText />} 
                                        label="ID Proof" 
                                        value={
                                            <Button variant="outline" size="sm" onClick={() => handleViewImage(userProfile.idProofUrl!)}>
                                                <Eye className="mr-2 h-4 w-4" /> View Document
                                            </Button>
                                        } 
                                    />
                                )}
                                {userProfile.idProofType && <ProfileDetail icon={<BadgeInfo />} label="ID Type" value={userProfile.idProofType} />}
                                {userProfile.idNumber && <ProfileDetail icon={<Hash />} label="ID Number" value={userProfile.idNumber} />}
                            </>
                        ) : (
                             <p className="text-center text-muted-foreground">Could not load user profile.</p>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>ID Proof</DialogTitle>
                    </DialogHeader>
                    {imageToView && (
                        <div className="relative h-[70vh] w-full mt-4">
                            <Image src={imageToView} alt="ID proof" fill className="object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
