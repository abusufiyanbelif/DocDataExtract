'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import type { Campaign } from '@/lib/types';

interface CopyCampaignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaign: Campaign | null;
    onCopyConfirm: (options: { newName: string; copyBeneficiaries: boolean; copyDonations: boolean; copyRationLists: boolean; }) => Promise<void>;
}

export function CopyCampaignDialog({ open, onOpenChange, campaign, onCopyConfirm }: CopyCampaignDialogProps) {
    const [newName, setNewName] = useState('');
    const [copyBeneficiaries, setCopyBeneficiaries] = useState(false);
    const [copyDonations, setCopyDonations] = useState(false);
    const [copyRationLists, setCopyRationLists] = useState(true);
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        if (campaign) {
            setNewName(`Copy of ${campaign.name}`);
        }
    }, [campaign]);
    
    const handleConfirm = async () => {
        if (!campaign || !newName) return;
        setIsCopying(true);
        await onCopyConfirm({ newName, copyBeneficiaries, copyDonations, copyRationLists });
        setIsCopying(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Copy Campaign: {campaign?.name}</DialogTitle>
                    <DialogDescription>
                        Create a new campaign based on this one. Choose what to include.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-campaign-name">New Campaign Name</Label>
                        <Input id="new-campaign-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <Separator />
                    <h4 className="font-medium">Copy Options</h4>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="copy-summary" checked disabled />
                            <Label htmlFor="copy-summary" className="text-sm font-normal">Campaign Summary & Details (Always copied)</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Checkbox id="copy-ration" checked={copyRationLists} onCheckedChange={(checked) => setCopyRationLists(!!checked)} />
                            <Label htmlFor="copy-ration" className="text-sm font-normal">Ration Lists</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="copy-beneficiaries" checked={copyBeneficiaries} onCheckedChange={(checked) => setCopyBeneficiaries(!!checked)} />
                            <Label htmlFor="copy-beneficiaries" className="text-sm font-normal">Beneficiary List (as new records)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="copy-donations" checked={copyDonations} onCheckedChange={(checked) => setCopyDonations(!!checked)} />
                            <Label htmlFor="copy-donations" className="text-sm font-normal">Donations (as new records for this campaign)</Label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCopying}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isCopying || !newName}>
                        {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Copy Campaign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
