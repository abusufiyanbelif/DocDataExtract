'use server';

import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin-sdk';
import type { UserProfile } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function deleteUserAction(uidToDelete: string): Promise<{ success: boolean; message: string }> {
  try {
    // In a production app, you would add robust auth checks here to ensure
    // the calling user is an administrator. For this starter, we rely on the
    // client-side checks that prevent non-admins from even seeing the delete button.

    const userRecord = await adminAuth.getUser(uidToDelete);
    const userProfileRef = adminDb.collection('users').doc(uidToDelete);
    const userProfileSnap = await userProfileRef.get();
    const userProfile = userProfileSnap.data() as UserProfile | undefined;

    // 1. Delete from Firebase Auth
    await adminAuth.deleteUser(uidToDelete);
    
    // 2. Delete from Firestore (user profile and lookups)
    const batch = adminDb.batch();
    batch.delete(userProfileRef);
    if (userProfile?.loginId) {
        batch.delete(adminDb.collection('user_lookups').doc(userProfile.loginId));
    }
    if (userProfile?.phone) {
        batch.delete(adminDb.collection('user_lookups').doc(userProfile.phone));
    }
    if (userProfile?.userKey) {
        batch.delete(adminDb.collection('user_lookups').doc(userProfile.userKey));
    }
    await batch.commit();

    // 3. Delete from Storage
    if (userProfile?.idProofUrl) {
      try {
        const url = new URL(userProfile.idProofUrl);
        const filePath = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
        await adminStorage.bucket().file(filePath).delete();
      } catch (storageError) {
        console.error(`Could not delete storage file for user ${uidToDelete}. It may not exist.`, storageError);
      }
    }

    revalidatePath('/users');
    return { success: true, message: `User '${userRecord.displayName || userRecord.email}' has been completely deleted.` };

  } catch (error: any) {
    console.error('Error in deleteUserAction:', error);
    let message = 'An unexpected error occurred during user deletion.';
    if (error.code === 'auth/user-not-found') {
        // This can happen if the user was already deleted from auth but not from the db.
        // In this case, we can proceed to clean up the DB records.
        message = 'User not found in Firebase Authentication, but proceeding with database cleanup.';
        console.warn(message);
        try {
            const userProfileRef = adminDb.collection('users').doc(uidToDelete);
            await userProfileRef.delete();
            revalidatePath('/users');
            return { success: true, message: 'User was already deleted from Auth. Database records cleaned up.' };
        } catch (dbError) {
            return { success: false, message: 'User not found in Auth, and failed to clean up database records.' };
        }
    } else if (error.code === 'permission-denied') {
        message = 'You do not have permission to perform this action.';
    }
    return { success: false, message: message };
  }
}
