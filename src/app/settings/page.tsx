
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from '@/hooks/use-session';
import { useBranding } from '@/hooks/use-branding';
import { useStorage, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, UploadCloud, ShieldAlert, Save, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
    const { userProfile, isLoading: isSessionLoading } = useSession();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const storage = useStorage();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (logoFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(logoFile);
        } else {
            setPreviewUrl(brandingSettings?.logoUrl || null);
        }
    }, [logoFile, brandingSettings]);

    const canReadSettings = userProfile?.role === 'Admin' || !!userProfile?.permissions?.settings?.read;
    const canUpdateSettings = userProfile?.role === 'Admin' || !!userProfile?.permissions?.settings?.update;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setLogoFile(event.target.files[0]);
        }
    };

    const handleSave = async () => {
        if (!logoFile || !storage || !firestore || !canUpdateSettings) {
            toast({
                title: 'Error',
                description: 'No file selected or insufficient permissions.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        toast({ title: 'Uploading logo...', description: 'Please wait.' });

        try {
            const filePath = 'settings/logo';
            const fileRef = storageRef(storage, filePath);
            
            // Delete old logo if it exists to avoid clutter, but don't fail if it doesn't
            if (brandingSettings?.logoUrl) {
                try {
                     const oldFileRef = storageRef(storage, brandingSettings.logoUrl);
                     await deleteObject(oldFileRef);
                } catch (e: any) {
                    if (e.code !== 'storage/object-not-found') {
                        console.warn("Could not delete old logo, it may not exist or rules are restrictive.", e);
                    }
                }
            }
            
            const uploadResult = await uploadBytes(fileRef, logoFile);
            const downloadUrl = await getDownloadURL(uploadResult.ref);

            const settingsDocRef = doc(firestore, 'settings', 'branding');
            await setDoc(settingsDocRef, { logoUrl: downloadUrl }, { merge: true });

            toast({
                title: 'Success!',
                description: 'Logo has been updated successfully.',
                variant: 'success',
            });
            setLogoFile(null); // Clear the file input after successful upload

        } catch (error: any) {
            console.error('Logo upload failed:', error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'settings/branding',
                    operation: 'write',
                }));
            } else {
                toast({
                    title: 'Upload Failed',
                    description: error.message || 'An unexpected error occurred.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isSessionLoading || isBrandingLoading;

    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!canReadSettings) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <DocuExtractHeader />
                <main className="container mx-auto p-4 md:p-8">
                     <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>
                            You do not have permission to access this page.
                        </AlertDescription>
                    </Alert>
                </main>
            </div>
        );
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
                        <CardTitle>Application Settings</CardTitle>
                        <CardDescription>Manage global settings for the application, like the company logo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <h3 className="text-lg font-medium">Application Logo</h3>
                             <p className="text-sm text-muted-foreground">
                                Upload a logo to be displayed in the header. For best results, use a PNG with a transparent background.
                             </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-48 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/30">
                                {previewUrl ? (
                                    <Image src={previewUrl} alt="Logo preview" layout="fill" objectFit="contain" className="p-2" />
                                ) : (
                                    <div className="text-muted-foreground text-center p-2">
                                        <ImageIcon className="mx-auto h-8 w-8" />
                                        <p className="text-xs mt-1">No logo uploaded</p>
                                    </div>
                                )}
                            </div>
                            <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} disabled={!canUpdateSettings} />
                            <Button onClick={handleSave} disabled={!logoFile || isSubmitting || !canUpdateSettings} className="w-full">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Upload and Save Logo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
