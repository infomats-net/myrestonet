
'use client';

import { useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function PwaManager() {
  const { messaging, firestore, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration);
          },
          (err) => {
            console.log('SW registration failed: ', err);
          }
        );
      });
    }

    // 2. Notification Permissions & FCM Token
    if (messaging && user && firestore) {
      const setupNotifications = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: 'BIsZ6_v_In... (Your Public VAPID Key here if applicable)'
            });
            
            if (token) {
              await updateDoc(doc(firestore, 'users', user.uid), {
                fcmTokens: arrayUnion(token)
              });
            }
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      setupNotifications();

      // Listen for foreground messages
      const unsubscribe = onMessage(messaging, (payload) => {
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body || '',
        });
      });

      return () => unsubscribe();
    }
  }, [messaging, user, firestore, toast]);

  return null;
}
