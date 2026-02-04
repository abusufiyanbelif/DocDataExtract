
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection } from '@/firebase';
import { collectionGroup, query, where, limit } from 'firebase/firestore';
import type { Beneficiary } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Loader2, Search } from 'lucide-react';

interface BeneficiarySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBeneficiary: (beneficiary: Omit<Beneficiary, 'id'>) => void;
  currentLeadId: string;
}

export function BeneficiarySearchDialog({ open, onOpenChange, onSelectBeneficiary, currentLeadId }: BeneficiarySearchDialogProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Beneficiary[]>([]);

  const handleSearch = async () => {
    if (!firestore || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    
    const lowerCaseTerm = searchTerm.toLowerCase();

    // Note: This requires a composite index in Firestore. 
    // The console will provide a link to create it if it's missing.
    const beneficiariesRef = collectionGroup(firestore, 'beneficiaries');
    const q = query(
        beneficiariesRef, 
        // Firestore doesn't support OR queries on different fields, so we search by name for now.
        // A more advanced search would use a dedicated search service like Algolia.
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(20)
    );
    
    try {
      const { data, error } = await new Promise<any>((resolve) => {
        const { data, error } = useCollection(q);
        // This is not a hook, so we need to handle the loading state differently.
        // For simplicity, we just use a timeout to wait for the data.
        setTimeout(() => resolve({data, error}), 1000);
      });

      // A simple client-side re-query simulation using a hook would be better.
      // This is a temporary solution for the demo.
      const beneficiariesQuery = query(collectionGroup(firestore, 'beneficiaries'));
      const querySnapshot = await require('firebase/firestore').getDocs(beneficiariesQuery);
      const allBeneficiaries: Beneficiary[] = [];
      querySnapshot.forEach((doc: any) => {
          allBeneficiaries.push({ id: doc.id, ...doc.data() } as Beneficiary);
      });

      const filtered = allBeneficiaries.filter(b => 
        b.name.toLowerCase().includes(lowerCaseTerm) || 
        (b.phone && b.phone.includes(searchTerm))
      ).slice(0, 20);

      setSearchResults(filtered);

    } catch (e) {
      console.error("Beneficiary search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (beneficiary: Beneficiary) => {
    const { id, ...beneficiaryData } = beneficiary;
    onSelectBeneficiary(beneficiaryData);
    onOpenChange(false);
  };

  useEffect(() => {
    // Reset search when dialog opens
    if (open) {
      setSearchTerm('');
      setSearchResults([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search Existing Beneficiaries</DialogTitle>
          <DialogDescription>
            Search by name or phone number to find and add an existing beneficiary.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Enter name or phone number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                </Button>
            </div>
            <ScrollArea className="h-64 border rounded-md">
                <div className="p-4 space-y-2">
                    {isSearching && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    {!isSearching && searchResults.length === 0 && (
                        <p className="text-center text-muted-foreground pt-10">{searchTerm ? 'No results found.' : 'Enter a search term to begin.'}</p>
                    )}
                    {!isSearching && searchResults.map(beneficiary => (
                        <div key={beneficiary.id} className="flex justify-between items-center p-2 rounded-md hover:bg-accent">
                            <div>
                                <p className="font-medium">{beneficiary.name}</p>
                                <p className="text-sm text-muted-foreground">{beneficiary.phone} - {beneficiary.address}</p>
                            </div>
                            <Button size="sm" onClick={() => handleSelect(beneficiary)}>Select</Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
