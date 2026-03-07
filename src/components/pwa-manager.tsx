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
            const vapidKey = 'BIsZ6_v_In... (Your Public VAPID Key here if applicable)';
            
            // Skip registration if the VAPID key is still a placeholder
            if (vapidKey.includes('...')) {
              return;
            }

            const token = await getToken(messaging, { vapidKey });
            
            if (token) {
              await updateDoc(doc(firestore, 'users', user.uid), {
                fcmTokens: arrayUnion(token)
              });
            }
          }
        } catch (error) {
          // Suppress FCM credential errors in dev environment
          console.warn('PWA Manager: Notification setup skipped or failed.', error);
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
