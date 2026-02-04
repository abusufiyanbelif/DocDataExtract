'use server';

import { adminDb } from '@/lib/firebase-admin-sdk';
import type { Donation, DonationCategory } from '@/lib/types';
import { donationCategories } from '@/lib/modules';
import { revalidatePath } from 'next/cache';

export async function syncDonationsAction(): Promise<{ success: boolean; message: string; updatedCount: number; }> {
    if (!adminDb) {
        const errorMessage = 'Firebase Admin SDK is not initialized. Sync cannot proceed.';
        console.error(errorMessage);
        return { success: false, message: errorMessage, updatedCount: 0 };
    }

    try {
        const donationsRef = adminDb.collection('donations');
        const snapshot = await donationsRef.get();

        if (snapshot.empty) {
            return { success: true, message: 'No donations found to sync.', updatedCount: 0 };
        }

        const batch = adminDb.batch();
        let updatedCount = 0;

        for (const doc of snapshot.docs) {
            const donation = doc.data() as Donation;
            
            // Sync if typeSplit is missing/empty.
            // This will migrate documents with the old `type` field and also
            // set a default for documents that have neither.
            if (!donation.typeSplit || donation.typeSplit.length === 0) {
                let category: DonationCategory = 'Sadqa'; // Default to Sadqa

                // If legacy `type` field exists, use it for migration.
                if (donation.type) {
                    if (donation.type === 'General') {
                        category = 'Sadqa';
                    } else if (donationCategories.includes(donation.type as DonationCategory)) {
                        category = donation.type as DonationCategory;
                    }
                    // Any other legacy `type` value will fall through and use the 'Sadqa' default.
                }
                
                const newTypeSplit = [{
                    category: category,
                    amount: donation.amount
                }];

                // Update the document in the batch
                batch.update(doc.ref, { typeSplit: newTypeSplit });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            await batch.commit();
            // Revalidate paths to ensure data freshness
            revalidatePath('/donations/summary');
            revalidatePath('/donations');
            revalidatePath('/campaign-members', 'layout');
            return { success: true, message: `Successfully synced ${updatedCount} donation records.`, updatedCount };
        }

        return { success: true, message: 'All donation records are already up to date.', updatedCount: 0 };

    } catch (error: any) {
        console.error('Error in syncDonationsAction:', error);
        return { success: false, message: `An unexpected error occurred during sync: ${error.message}`, updatedCount: 0 };
    }
}
