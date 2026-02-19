import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Timestamp } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  type: string;
  appointmentId: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
}

export function useNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const sorted = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as AppNotification))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setNotifications(sorted);
    });
    return unsub;
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { isRead: true }));
    await batch.commit();
  };

  return { notifications, unreadCount, markAllRead };
}
