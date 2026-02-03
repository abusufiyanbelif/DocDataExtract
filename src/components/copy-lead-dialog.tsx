
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Info } from 'lucide-react';
import type { Lead } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CopyLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead: Lead | null;
    onCopyConfirm: (options: { newName: string; copyBeneficiaries: boolean; copyRationLists: boolean; }) => Promise<void>;
}

export function CopyLeadDialog({ open, onOpenChange, lead, onCopyConfirm }: CopyLeadDialogProps) {
    const [newName, setNewName] = useState('');
    const [copyBeneficiaries, setCopyBeneficiaries] = useState(false);
    const [copyRationLists, setCopyRationLists] = useState(true);
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        if (lead) {
            setNewName(`Copy of ${lead.name}`);
        } else {
            setNewName('');
            setCopyBeneficiaries(false);
            setCopyRationLists(true);
        }
    }, [lead]);
    
    const handleConfirm = async () => {
        if (!lead || !newName) return;
        setIsCopying(true);
        await onCopyConfirm({ newName, copyBeneficiaries, copyRationLists });
        setIsCopying(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Copy Lead</DialogTitle>
                    <DialogDescription>
                        Create a new lead based on an existing one. Choose what to include below.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="source-lead-name">Source Lead</Label>
                        <Input id="source-lead-name" value={lead?.name || ''} readOnly disabled className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-lead-name">New Lead Name</Label>
                        <Input id="new-lead-name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={isCopying} />
                    </div>
                    
                    <Separator />
                    
                    <h4 className="font-medium text-sm">Copy Options</h4>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Independent Records</AlertTitle>
                        <AlertDescription>
                            All selected items will be created as new, separate records. Changes made to this new lead's data will not affect the original.
                        </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="copy-summary-lead" checked disabled />
                            <Label htmlFor="copy-summary-lead" className="text-sm font-normal">Lead Summary & Details (Always copied)</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Checkbox id="copy-ration-lead" checked={copyRationLists} onCheckedChange={(checked) => setCopyRationLists(!!checked)} disabled={isCopying} />
                            <Label htmlFor="copy-ration-lead" className="text-sm font-normal">Ration Lists</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="copy-beneficiaries-lead" checked={copyBeneficiaries} onCheckedChange={(checked) => setCopyBeneficiaries(!!checked)} disabled={isCopying} />
                            <Label htmlFor="copy-beneficiaries-lead" className="text-sm font-normal">Beneficiary List (as new records)</Label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCopying}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isCopying || !newName}>
                        {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Copy Lead
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
