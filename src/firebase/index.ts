// This file serves as a barrel for all Firebase-related modules,
// making imports cleaner across the application.
// It should not contain any logic or 'use client' directive.

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './error-emitter';
export * from './errors';
