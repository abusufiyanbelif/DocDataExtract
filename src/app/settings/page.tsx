
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
import { ArrowLeft, Loader2, UploadCloud, ShieldAlert, Save, Image as ImageIcon, QrCode, Edit } from 'lucide-react';
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
    
    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initial State for Dirty Check
    const [initialBranding, setInitialBranding] = useState({});
    const [initialPayment, setInitialPayment] = useState({});

    // State for branding
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoWidth, setLogoWidth] = useState<number | string>('');
    const [logoHeight, setLogoHeight] = useState<number | string>('');
    
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

    const populateFormStates = () => {
        if (brandingSettings) {
            const initialData = {
                logoWidth: brandingSettings.logoWidth || '',
                logoHeight: brandingSettings.logoHeight || '',
            };
            setLogoWidth(initialData.logoWidth);
            setLogoHeight(initialData.logoHeight);
            setLogoPreviewUrl(brandingSettings.logoUrl || null);
            setInitialBranding(initialData);
        }
        if (paymentSettings) {
            const initialData = {
                upiId: paymentSettings.upiId || '',
                paymentMobileNumber: paymentSettings.paymentMobileNumber || '',
                contactEmail: paymentSettings.contactEmail || '',
                contactPhone: paymentSettings.contactPhone || '',
                qrWidth: paymentSettings.qrWidth || '',
                qrHeight: paymentSettings.qrHeight || '',
                regNo: paymentSettings.regNo || '',
                pan: paymentSettings.pan || '',
                address: paymentSettings.address || '',
            };
            setUpiId(initialData.upiId);
            setPaymentMobileNumber(initialData.paymentMobileNumber);
            setContactEmail(initialData.contactEmail);
            setContactPhone(initialData.contactPhone);
            setQrWidth(initialData.qrWidth);
            setQrHeight(initialData.qrHeight);
            setRegNo(initialData.regNo);
            setPan(initialData.pan);
            setAddress(initialData.address);
            setQrPreviewUrl(paymentSettings.qrCodeUrl || null);
            setInitialPayment(initialData);
        }
    };
    
    // Populate form state from fetched settings
    useEffect(() => {
        populateFormStates();
    }, [brandingSettings, paymentSettings]);

    // Check for dirty state
    useEffect(() => {
        if (!isEditMode) {
            setIsDirty(false);
            return;
        }
        const brandingIsDirty = 
            logoFile !== null ||
            logoWidth !== initialBranding.logoWidth ||
            logoHeight !== initialBranding.logoHeight;

        const paymentIsDirty = 
            qrCodeFile !== null ||
            upiId !== initialPayment.upiId ||
            paymentMobileNumber !== initialPayment.paymentMobileNumber ||
            contactEmail !== initialPayment.contactEmail ||
            contactPhone !== initialPayment.contactPhone ||
            qrWidth !== initialPayment.qrWidth ||
            qrHeight !== initialPayment.qrHeight ||
            regNo !== initialPayment.regNo ||
            pan !== initialPayment.pan ||
            address !== initialPayment.address;

        setIsDirty(brandingIsDirty || paymentIsDirty);
    }, [isEditMode, logoFile, logoWidth, logoHeight, qrCodeFile, upiId, paymentMobileNumber, contactEmail, contactPhone, qrWidth, qrHeight, regNo, pan, address, initialBranding, initialPayment]);

    // Handle logo preview
    useEffect(() => {
        if (logoFile) {
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreviewUrl(reader.result as string);
            reader.readAsDataURL(logoFile);
        } else if (brandingSettings?.logoUrl) {
            setLogoPreviewUrl(brandingSettings.logoUrl);
        } else {
            setLogoPreviewUrl(null);
        }
    }, [logoFile, brandingSettings]);

    // Handle QR preview
    useEffect(() => {
        if (qrCodeFile) {
            const reader = new FileReader();
            reader.onloadend = () => setQrPreviewUrl(reader.result as string);
            reader.readAsDataURL(qrCodeFile);
        } else if (paymentSettings?.qrCodeUrl) {
            setQrPreviewUrl(paymentSettings.qrCodeUrl);
        } else {
            setQrPreviewUrl(null);
        }
    }, [qrCodeFile, paymentSettings]);

    const canUpdateSettings = userProfile?.role === 'Admin' || !!userProfile?.permissions?.settings?.update;
    
    const handleSave = async () => {
        if (!firestore || !canUpdateSettings || !isDirty) {
            toast({ title: 'Error', description: 'No changes to save or insufficient permissions.', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        toast({ title: 'Saving settings...', description: 'Please wait.' });

        try {
            // Branding Save Logic
            let logoUrl = brandingSettings?.logoUrl || '';
            if (logoFile && storage) {
                const filePath = 'settings/logo';
                const fileRef = storageRef(storage, filePath);
                if (brandingSettings?.logoUrl) {
                    try { await deleteObject(storageRef(storage, brandingSettings.logoUrl)); } catch (e) {}
                }
                const uploadResult = await uploadBytes(fileRef, logoFile);
                logoUrl = await getDownloadURL(uploadResult.ref);
            }
            const brandingData = { 
                logoUrl,
                logoWidth: Number(logoWidth) || null,
                logoHeight: Number(logoHeight) || null
            };
            await setDoc(doc(firestore, 'settings', 'branding'), brandingData, { merge: true });

            // Payment Save Logic
            let qrCodeUrl = paymentSettings?.qrCodeUrl || '';
            if (qrCodeFile && storage) {
                const filePath = 'settings/payment_qr';
                const fileRef = storageRef(storage, filePath);
                if (qrCodeUrl) {
                    try { await deleteObject(storageRef(storage, qrCodeUrl)); } catch (e) {}
                }
                const uploadResult = await uploadBytes(fileRef, qrCodeFile);
                qrCodeUrl = await getDownloadURL(uploadResult.ref);
            }
            const paymentData = {
                qrCodeUrl, qrWidth: Number(qrWidth) || null, qrHeight: Number(qrHeight) || null,
                upiId, paymentMobileNumber, contactEmail, contactPhone, regNo, pan, address
            };
            await setDoc(doc(firestore, 'settings', 'payment'), paymentData, { merge: true });

            toast({ title: 'Success!', description: 'Settings have been updated successfully.', variant: 'success' });
            setLogoFile(null);
            setQrCodeFile(null);
            setIsEditMode(false);
        } catch (error: any) {
            console.error('Settings save failed:', error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'settings/branding or settings/payment', operation: 'write' }));
            } else {
                toast({ title: 'Save Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancel = () => {
        populateFormStates();
        setIsEditMode(false);
        setLogoFile(null);
        setQrCodeFile(null);
    };

    const isLoading = isSessionLoading || isBrandingLoading || isPaymentLoading;
    const isFormDisabled = !isEditMode || isSubmitting;

    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!canUpdateSettings) {
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
                
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    {!isEditMode ? (
                        <Button onClick={() => setIsEditMode(true)}><Edit className="mr-2 h-4 w-4"/>Edit Settings</Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSubmitting || !isDirty}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save All
                            </Button>
                        </div>
                    )}
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
                                    Upload a logo to be displayed in the header and as a watermark.
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
                                        <Input id="logoWidth" type="number" placeholder="e.g., 48" value={logoWidth} onChange={(e) => setLogoWidth(e.target.value)} disabled={isFormDisabled} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="logoHeight">Height (px)</Label>
                                        <Input id="logoHeight" type="number" placeholder="e.g., 48" value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)} disabled={isFormDisabled} />
                                    </div>
                                </div>
                                <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => e.target.files && setLogoFile(e.target.files[0])} disabled={isFormDisabled} />
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
                                    <Input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. Solapur/0000373/2025" disabled={isFormDisabled} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pan">PAN</Label>
                                    <Input id="pan" value={pan} onChange={(e) => setPan(e.target.value)} placeholder="e.g. AAPAB1213J" disabled={isFormDisabled} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address of the organization" disabled={isFormDisabled} />
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
                                                <Input id="qrWidth" type="number" placeholder="e.g., 128" value={qrWidth} onChange={(e) => setQrWidth(e.target.value)} disabled={isFormDisabled} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="qrHeight">Height (px)</Label>
                                                <Input id="qrHeight" type="number" placeholder="e.g., 128" value={qrHeight} onChange={(e) => setQrHeight(e.target.value)} disabled={isFormDisabled} />
                                            </div>
                                        </div>
                                        <Input id="qr-upload" type="file" accept="image/png, image/jpeg" onChange={(e) => e.target.files && setQrCodeFile(e.target.files[0])} disabled={isFormDisabled} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="upiId">UPI ID</Label>
                                    <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. 1234567890@upi" disabled={isFormDisabled} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentMobile">Payment Mobile Number</Label>
                                    <Input id="paymentMobile" value={paymentMobileNumber} onChange={(e) => setPaymentMobileNumber(e.target.value)} placeholder="e.g. 9876543210" disabled={isFormDisabled} />
                                </div>
                                <Separator />
                                 <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact Email</Label>
                                    <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. contact@example.com" disabled={isFormDisabled} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Contact Phone</Label>
                                    <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 9876543210" disabled={isFormDisabled} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
