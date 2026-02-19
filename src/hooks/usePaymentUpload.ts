import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

export function usePaymentUpload() {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipt = async (appointmentId: string, file: File): Promise<string> => {
    setUploading(true);
    setError(null);

    try {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo no debe superar 5MB');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Solo se permiten archivos JPG, PNG, WebP o PDF');
      }

      // Upload to Firebase Storage
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `payment_receipts/${appointmentId}/receipt.${ext}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Update appointment document
      await updateDoc(doc(db, 'appointments', appointmentId), {
        paymentProofUrl: downloadUrl,
        paymentStatus: 'PROOF_UPLOADED',
        updatedAt: Timestamp.now(),
      });

      return downloadUrl;
    } catch (err: any) {
      const message = err.message || 'Error al subir el comprobante';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  };

  const confirmPayment = async (appointmentId: string) => {
    setConfirming(true);
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        paymentStatus: 'CONFIRMED',
        updatedAt: Timestamp.now(),
      });
    } catch (err: any) {
      throw new Error(err.message || 'Error al confirmar el pago');
    } finally {
      setConfirming(false);
    }
  };

  return { uploadReceipt, confirmPayment, uploading, confirming, error };
}
