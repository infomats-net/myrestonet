'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      // In development/Studio, we prefer the explicit config to ensure accuracy
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    // Enable Offline Persistence
    if (typeof window !== 'undefined') {
      const db = getFirestore(firebaseApp);
      enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistence failed: multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Persistence is not supported by this browser');
        }
      });
    }
  } else {
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  
  let messaging: Messaging | undefined;
  if (typeof window !== 'undefined') {
    try {
      messaging = getMessaging(firebaseApp);
    } catch (e) {
      console.warn('Messaging not supported in this environment');
    }
  }

  return {
    firebaseApp,
    auth,
    firestore,
    messaging
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
