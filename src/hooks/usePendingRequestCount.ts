import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function usePendingRequestCount() {
  const { currentUser, customClaims } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentUser || customClaims?.role !== 'THERAPIST') {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, 'appointment_requests'),
      where('therapistId', '==', currentUser.uid),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCount(snapshot.size);
      },
      (err) => {
        console.error('Pending request count error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, customClaims]);

  return count;
}
