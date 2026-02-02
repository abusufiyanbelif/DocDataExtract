'use client';
import { ReactNode, useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    try {
      const services = initializeFirebase();
      return { ...services, initializationError: null };
    } catch (error: any) {
      console.error("Failed to initialize Firebase. Please check your configuration.", error);
      
      let finalError = error;
      // Enhance the error message for common "service not available" issues.
      if (error.code === 'unavailable' || (error.message && error.message.toLowerCase().includes('is not available'))) {
          let serviceName = 'a Firebase service';
          if (error.message.includes('firestore')) serviceName = 'Firestore';
          if (error.message.includes('auth')) serviceName = 'Authentication';
          if (error.message.includes('storage')) serviceName = 'Storage';
          
          finalError = new Error(`The ${serviceName} is not available. This usually means it hasn't been enabled for your project in the Firebase Console. Please go to your Firebase project, find the "${serviceName}" section, and complete its setup process.`);
          finalError.stack = error.stack; // preserve original stack
      }

      return { app: null, auth: null, firestore: null, storage: null, initializationError: finalError };
    }
  }, []);

  return <FirebaseProvider value={firebaseServices}>{children}</FirebaseProvider>;
}
