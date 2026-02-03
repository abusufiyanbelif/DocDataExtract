
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from '@/hooks/use-session';
import { useBranding } from '@/hooks/use-branding';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import { useStorage, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, UploadCloud, ShieldAlert, Save, Image as ImageIcon, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
    const { userProfile, isLoading: isSessionLoading } = useSession();
    const { brandingSettings, isLoading: isBrandingLoading } = useBranding();
    const { paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();
    const storage = useStorage();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // State for branding
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoWidth, setLogoWidth] = useState<number | string>('');
    const [logoHeight, setLogoHeight] = useState<number | string>('');
    const [isBrandingSubmitting, setIsBrandingSubmitting] = useState(false);

    // State for payment settings
    const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
    const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
    const [qrWidth, setQrWidth] = useState<number | string>('');
    const [qrHeight, setQrHeight] = useState<number | string>('');
    const [upiId, setUpiId] = useState('');
    const [paymentMobileNumber, setPaymentMobileNumber] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [regNo, setRegNo] = useState('');
    const [pan, setPan] = useState('');
    const [address, setAddress] = useState('');
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

    // Effect for branding logo preview
    useEffect(() => {
        if (brandingSettings) {
            setLogoWidth(brandingSettings.logoWidth || '');
            setLogoHeight(brandingSettings.logoHeight || '');
        }

        if (logoFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(logoFile);
        } else {
            setLogoPreviewUrl(brandingSettings?.logoUrl || null);
        }
    }, [logoFile, brandingSettings]);

    // Effect for payment settings QR code preview and form fields
    useEffect(() => {
        if (paymentSettings) {
            setUpiId(paymentSettings.upiId || '');
            setPaymentMobileNumber(paymentSettings.paymentMobileNumber || '');
            setContactEmail(paymentSettings.contactEmail || '');
            setContactPhone(paymentSettings.contactPhone || '');
            setQrWidth(paymentSettings.qrWidth || '');
            setQrHeight(paymentSettings.qrHeight || '');
            setRegNo(paymentSettings.regNo || '');
            setPan(paymentSettings.pan || '');
            setAddress(paymentSettings.address || '');
        }
        if (qrCodeFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setQrPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(qrCodeFile);
        } else if (paymentSettings) {
             setQrPreviewUrl(paymentSettings.qrCodeUrl || null);
        }
    }, [qrCodeFile, paymentSettings]);

    const canReadSettings = userProfile?.role === 'Admin' || !!userProfile?.permissions?.settings?.read;
    const canUpdateSettings = userProfile?.role === 'Admin' || !!userProfile?.permissions?.settings?.update;

    const handleBrandingSave = async () => {
        if (!firestore || !canUpdateSettings) {
            toast({
                title: 'Error',
                description: 'Insufficient permissions.',
                variant: 'destructive',
            });
            return;
        }

        setIsBrandingSubmitting(true);
        toast({ title: 'Saving branding settings...', description: 'Please wait.' });

        try {
            let logoUrl = brandingSettings?.logoUrl || '';

            if (logoFile && storage) {
                const filePath = 'settings/logo';
                const fileRef = storageRef(storage, filePath);
                
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
                logoUrl = await getDownloadURL(uploadResult.ref);
            }

            const settingsDocRef = doc(firestore, 'settings', 'branding');
            await setDoc(settingsDocRef, { 
                logoUrl,
                logoWidth: Number(logoWidth) || null,
                logoHeight: Number(logoHeight) || null
            }, { merge: true });

            toast({
                title: 'Success!',
                description: 'Branding settings have been updated successfully.',
                variant: 'success',
            });
            setLogoFile(null);

        } catch (error: any) {
            console.error('Branding settings save failed:', error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'settings/branding',
                    operation: 'write',
                }));
            } else {
                toast({
                    title: 'Save Failed',
                    description: error.message || 'An unexpected error occurred.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsBrandingSubmitting(false);
        }
    };

    const handlePaymentSave = async () => {
        if (!firestore || !canUpdateSettings) {
            toast({ title: 'Error', description: 'Insufficient permissions.', variant: 'destructive' });
            return;
        }
        setIsPaymentSubmitting(true);
        toast({ title: 'Saving payment settings...', description: 'Please wait.' });

        try {
            let qrCodeUrl = paymentSettings?.qrCodeUrl || '';
            
            if (qrCodeFile && storage) {
                const filePath = 'settings/payment_qr';
                const fileRef = storageRef(storage, filePath);

                if (qrCodeUrl) {
                    try {
                        const oldFileRef = storageRef(storage, qrCodeUrl);
                        await deleteObject(oldFileRef);
                    } catch (e: any) {
                        if (e.code !== 'storage/object-not-found') {
                            console.warn("Could not delete old QR code.", e);
                        }
                    }
                }
                const uploadResult = await uploadBytes(fileRef, qrCodeFile);
                qrCodeUrl = await getDownloadURL(uploadResult.ref);
            }
            
            const settingsDocRef = doc(firestore, 'settings', 'payment');
            const dataToSave = {
                qrCodeUrl,
                qrWidth: Number(qrWidth) || null,
                qrHeight: Number(qrHeight) || null,
                upiId,
                paymentMobileNumber,
                contactEmail,
                contactPhone,
                regNo,
                pan,
                address
            };
            await setDoc(settingsDocRef, dataToSave, { merge: true });

            toast({ title: 'Success!', description: 'Payment settings have been updated.', variant: 'success' });
            setQrCodeFile(null);

        } catch (error: any) {
             console.error('Payment settings save failed:', error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'settings/payment',
                    operation: 'write',
                }));
            } else {
                toast({
                    title: 'Save Failed',
                    description: error.message || 'An unexpected error occurred.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsPaymentSubmitting(false);
        }
    };

    const isLoading = isSessionLoading || isBrandingLoading || isPaymentLoading;

    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!canReadSettings) {
        return (
            <div className="min-h-screen text-foreground">
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
        <div className="min-h-screen text-foreground">
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
                <div className="grid gap-8 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding Settings</CardTitle>
                            <CardDescription>Manage the application logo and watermark.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Application Logo</h3>
                                <p className="text-sm text-muted-foreground">
                                    Upload a logo to be displayed in the header. For best results, use a PNG with a transparent background. This will also be used as the page watermark.
                                </p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-48 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/30">
                                    {logoPreviewUrl ? (
                                        <Image src={logoPreviewUrl} alt="Logo preview" fill className="object-contain p-2" />
                                    ) : (
                                        <div className="text-muted-foreground text-center p-2">
                                            <ImageIcon className="mx-auto h-8 w-8" />
                                            <p className="text-xs mt-1">No logo uploaded</p>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="logoWidth">Width (px)</Label>
                                        <Input id="logoWidth" type="number" placeholder="e.g., 48" value={logoWidth} onChange={(e) => setLogoWidth(e.target.value)} disabled={!canUpdateSettings || isBrandingSubmitting} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="logoHeight">Height (px)</Label>
                                        <Input id="logoHeight" type="number" placeholder="e.g., 48" value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)} disabled={!canUpdateSettings || isBrandingSubmitting} />
                                    </div>
                                </div>
                                <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => e.target.files && setLogoFile(e.target.files[0])} disabled={!canUpdateSettings || isBrandingSubmitting} />
                                <Button onClick={handleBrandingSave} disabled={isBrandingSubmitting || !canUpdateSettings} className="w-full">
                                    {isBrandingSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Branding
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Organization, Payment & Contact Settings</CardTitle>
                            <CardDescription>Configure QR code, UPI, and contact details for receipts and the footer.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="regNo">Registration No.</Label>
                                    <Input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. Solapur/0000373/2025" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan">PAN</Label>
                                    <Input id="pan" value={pan} onChange={(e) => setPan(e.target.value)} placeholder="e.g. AAPAB1213J" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address of the organization" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>UPI QR Code</Label>
                                     <div className="flex flex-col items-center gap-4">
                                        <div className="relative w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/30">
                                            {qrPreviewUrl ? (
                                                <Image src={qrPreviewUrl} alt="QR Code preview" fill className="object-contain p-2" />
                                            ) : (
                                                <div className="text-muted-foreground text-center p-2">
                                                    <QrCode className="mx-auto h-8 w-8" />
                                                    <p className="text-xs mt-1">No QR code uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="qrWidth">Width (px)</Label>
                                                <Input id="qrWidth" type="number" placeholder="e.g., 128" value={qrWidth} onChange={(e) => setQrWidth(e.target.value)} disabled={!canUpdateSettings || isPaymentSubmitting} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="qrHeight">Height (px)</Label>
                                                <Input id="qrHeight" type="number" placeholder="e.g., 128" value={qrHeight} onChange={(e) => setQrHeight(e.target.value)} disabled={!canUpdateSettings || isPaymentSubmitting} />
                                            </div>
                                        </div>
                                        <Input id="qr-upload" type="file" accept="image/png, image/jpeg" onChange={(e) => e.target.files && setQrCodeFile(e.target.files[0])} disabled={!canUpdateSettings || isPaymentSubmitting} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="upiId">UPI ID</Label>
                                    <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. 1234567890@upi" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentMobile">Payment Mobile Number</Label>
                                    <Input id="paymentMobile" value={paymentMobileNumber} onChange={(e) => setPaymentMobileNumber(e.target.value)} placeholder="e.g. 9876543210" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                                <Separator />
                                 <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact Email</Label>
                                    <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. contact@example.com" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Contact Phone</Label>
                                    <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 9876543210" disabled={!canUpdateSettings || isPaymentSubmitting} />
                                </div>
                            </div>
                            <Button onClick={handlePaymentSave} disabled={isPaymentSubmitting || !canUpdateSettings} className="w-full">
                                {isPaymentSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Settings
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
