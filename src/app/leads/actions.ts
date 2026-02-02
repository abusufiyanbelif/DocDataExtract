
'use server';

import { adminDb } from '@/lib/firebase-admin-sdk';
import type { Lead } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';

interface CopyLeadOptions {
  sourceLeadId: string;
  newName: string;
  copyBeneficiaries: boolean;
  copyRationLists: boolean;
}

const BATCH_SIZE = 400; // Firestore batch write limit is 500

export async function copyLeadAction(options: CopyLeadOptions): Promise<{ success: boolean; message: string }> {
  if (!adminDb) {
    const errorMessage = 'Firebase Admin SDK is not initialized. Lead copy cannot proceed.';
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  const { sourceLeadId, newName, copyBeneficiaries, copyRationLists } = options;

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
      createdByName: 'System Copy',
      createdById: 'system',
    };

    if (!copyRationLists) {
      newLeadData.rationLists = { 'General Item List': [] }; // Reset ration lists if not copied
    }
    
    delete newLeadData.id;

    const newLeadRef = await adminDb.collection('leads').add(newLeadData);

    // --- 2. Copy Beneficiaries (if requested) ---
    if (copyBeneficiaries) {
      const sourceBeneficiariesRef = sourceLeadRef.collection('beneficiaries');
      const beneficiariesSnap = await sourceBeneficiariesRef.get();
      
      if (!beneficiariesSnap.empty) {
        let batch = adminDb.batch();
        let count = 0;

        for (const doc of beneficiariesSnap.docs) {
            const beneficiaryData = doc.data() as any;
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

    revalidatePath('/leads');
    return { success: true, message: `Successfully copied lead to '${newName}'.` };

  } catch (error: any) {
    console.error('Error in copyLeadAction:', error);
    return { success: false, message: `An unexpected error occurred during copy: ${error.message}` };
  }
}
