'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, User, Shield, Phone, KeyRound, CheckCircle, XCircle, LogIn, FileText, BadgeInfo, Hash, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function ProfileDetail({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-medium">{value}</div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { userProfile, isLoading } = useUserProfile();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [imageToView, setImageToView] = useState<string | null>(null);

    const handleViewImage = (url: string) => {
        setImageToView(url);
        setIsImageViewerOpen(true);
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
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>This is your personal information as it appears in the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {userProfile ? (
                            <>
                                <ProfileDetail icon={<User />} label="Full Name" value={userProfile.name} />
                                <ProfileDetail icon={<LogIn />} label="Login ID" value={userProfile.loginId} />
                                <ProfileDetail icon={<Phone />} label="Phone Number" value={userProfile.phone} />
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
