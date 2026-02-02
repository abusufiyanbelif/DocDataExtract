
'use server';

import { adminDb, adminStorage } from '@/lib/firebase-admin-sdk';
import type { Lead, Beneficiary, Donation } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

interface CopyLeadOptions {
  sourceLeadId: string;
  newName: string;
  copyBeneficiaries: boolean;
  copyDonations: boolean;
  copyRationLists: boolean;
}

const BATCH_SIZE = 400; // Firestore batch write limit is 500

export async function copyLeadAction(options: CopyLeadOptions): Promise<{ success: boolean; message: string }> {
  if (!adminDb) {
    const errorMessage = 'Firebase Admin SDK is not initialized. Lead copy cannot proceed.';
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  const { sourceLeadId, newName, copyBeneficiaries, copyDonations, copyRationLists } = options;

  try {
    const sourceLeadRef = adminDb.collection('leads').doc(sourceLeadId);
    const sourceLeadSnap = await sourceLeadRef.get();

    if (!sourceLeadSnap.exists) {
      return { success: false, message: 'Source lead not found.' };
    }

    const sourceLeadData = sourceLeadSnap.data() as Lead;
    
    // --- 1. Create the new lead document ---
    const newLeadData: Partial<Lead> = {
      ...sourceLeadData,
      name: newName,
      status: 'Upcoming', // Copied leads should start as Upcoming
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // We assume the copier is the creator. In a real app you'd pass the userId.
      createdByName: 'System Copy',
      createdById: 'system',
    };

    if (!copyRationLists) {
      newLeadData.rationLists = { 'General Item List': [] }; // Reset ration lists if not copied
    }
    
    // Remove ID from data object
    delete newLeadData.id;

    const newLeadRef = await adminDb.collection('leads').add(newLeadData);
    const newLeadId = newLeadRef.id;

    // --- 2. Copy Beneficiaries (if requested) ---
    if (copyBeneficiaries) {
      const sourceBeneficiariesRef = sourceLeadRef.collection('beneficiaries');
      const beneficiariesSnap = await sourceBeneficiariesRef.get();
      
      if (!beneficiariesSnap.empty) {
        let batch = adminDb.batch();
        let count = 0;

        for (const doc of beneficiariesSnap.docs) {
            const beneficiaryData = doc.data() as Omit<Beneficiary, 'id'>;
            const newBeneficiaryRef = newLeadRef.collection('beneficiaries').doc();
            
            const newBeneficiaryData = {
                ...beneficiaryData,
                idProofUrl: '', 
                idProofIsPublic: false,
                status: 'Pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdByName: 'System Copy',
                createdById: 'system',
            };
            
            batch.set(newBeneficiaryRef, newBeneficiaryData);
            count++;

            if (count === BATCH_SIZE) {
                await batch.commit();
                batch = adminDb.batch();
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
      }
    }
    
    // --- 3. Copy Donations (if requested) ---
    if (copyDonations) {
        const sourceDonationsQuery = adminDb.collection('donations').where('leadId', '==', sourceLeadId);
        const donationsSnap = await sourceDonationsQuery.get();

        if (!donationsSnap.empty) {
            let batch = adminDb.batch();
            let count = 0;

            for (const doc of donationsSnap.docs) {
                const donationData = doc.data() as Omit<Donation, 'id'>;
                const newDonationRef = adminDb.collection('donations').doc();

                const newDonationData: Partial<Donation> = {
                    ...donationData,
                    leadId: newLeadId,
                    leadName: newName,
                    campaignId: undefined, // Unlink from old campaign if it was somehow linked
                    campaignName: undefined,
                    screenshotUrl: '',
                    screenshotIsPublic: false,
                    status: 'Pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    uploadedBy: 'System Copy',
                    uploadedById: 'system',
                };
                
                batch.set(newDonationRef, newDonationData);
                count++;
                
                if (count === BATCH_SIZE) {
                    await batch.commit();
                    batch = adminDb.batch();
                    count = 0;
                }
            }
            if (count > 0) {
                await batch.commit();
            }
        }
    }

    revalidatePath('/leads');
    return { success: true, message: `Successfully copied lead to '${newName}'.` };

  } catch (error: any) {
    console.error('Error in copyLeadAction:', error);
    return { success: false, message: `An unexpected error occurred during copy: ${error.message}` };
  }
}


export async function deleteLeadAction(leadId: string): Promise<{ success: boolean; message: string }> {
    if (!adminDb || !adminStorage) {
        return { success: false, message: 'Firebase Admin SDK is not initialized.' };
    }
    
    try {
        const leadRef = adminDb.collection('leads').doc(leadId);
        const leadSnap = await leadRef.get();
        if (!leadSnap.exists) return { success: false, message: 'Lead not found.' };

        const leadName = leadSnap.data()?.name || 'Unknown Lead';
        
        // --- Step 1: Collect Storage URLs ---
        const beneficiariesRef = leadRef.collection('beneficiaries');
        const beneficiariesSnap = await beneficiariesRef.get();
        const donationsQuery = adminDb.collection('donations').where('leadId', '==', leadId);
        const donationsSnap = await donationsQuery.get();

        const storageUrlsToDelete: string[] = [];
        beneficiariesSnap.forEach(doc => {
            const data = doc.data() as Beneficiary;
            if (data.idProofUrl) storageUrlsToDelete.push(data.idProofUrl);
        });
        donationsSnap.forEach(doc => {
            const data = doc.data() as Donation;
            if (data.screenshotUrl) storageUrlsToDelete.push(data.screenshotUrl);
        });

        // --- Step 2: Delete Files from Storage ---
        const deletePromises = storageUrlsToDelete.map(url => {
            try {
                const filePath = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
                return adminStorage.bucket().file(filePath).delete().catch(err => {
                    if (err.code !== 404) console.error(`Failed to delete storage file ${filePath}:`, err);
                });
            } catch (e) {
                console.error(`Invalid storage URL found for lead ${leadId}: ${url}`, e);
                return Promise.resolve();
            }
        });
        await Promise.all(deletePromises);
        
        // --- Step 3: Delete Firestore Docs ---
        const batch = adminDb.batch();
        beneficiariesSnap.forEach(doc => batch.delete(doc.ref));
        donationsSnap.forEach(doc => batch.delete(doc.ref));
        batch.delete(leadRef);
        await batch.commit();

        revalidatePath('/leads');
        return { success: true, message: `Lead '${leadName}' and all associated data deleted.` };
    } catch (error: any) {
        console.error('Error deleting lead:', error);
        return { success: false, message: `Failed to delete lead: ${error.message}` };
    }
}
