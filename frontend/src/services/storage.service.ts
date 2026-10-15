import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const storageService = {
  /**
   * Convert file or blob to base64 data URL for offline fallback
   */
  async blobToDataUrl(blob: Blob): Promise<string> {
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = typeof Buffer !== 'undefined' ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer);
    const base64 = typeof Buffer !== 'undefined'
      ? buffer.toString('base64')
      : btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
  },

  /**
   * Generic resilient upload helper
   */
  async uploadFile(path: string, file: File | Blob): Promise<string> {
    try {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline');
      }
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn(`[Firebase Storage] Cloud upload failed for ${path}, caching locally:`, err);
      // Offline fallback: encode as Data URL and persist locally
      const dataUrl = await this.blobToDataUrl(file);
      try {
        localStorage.setItem(`mud_media_${path.replace(/[^a-zA-Z0-9]/g, '_')}`, dataUrl);
      } catch {}
      return dataUrl;
    }
  },

  /**
   * Upload user profile avatar
   */
  async uploadAvatar(userId: string, file: File | Blob): Promise<string> {
    const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `avatars/${userId}/avatar_${Date.now()}.${ext}`;
    return this.uploadFile(path, file);
  },

  /**
   * Upload technician KYC document (Aadhaar, License, Certificate)
   */
  async uploadKycDocument(userId: string, docType: string, file: File | Blob): Promise<string> {
    const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `kyc_documents/${userId}/${docType}_${Date.now()}.${ext}`;
    return this.uploadFile(path, file);
  },

  /**
   * Upload customer damage report photo or doorstep repair proof
   */
  async uploadDamageReportPhoto(bookingId: string, file: File | Blob): Promise<string> {
    const ext = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `damage_reports/${bookingId}/proof_${Date.now()}.${ext}`;
    return this.uploadFile(path, file);
  },

  /**
   * Upload digital receipt PDF
   */
  async uploadReceiptPdf(receiptId: string, blob: Blob): Promise<string> {
    const path = `receipts/${receiptId}/invoice_${Date.now()}.pdf`;
    return this.uploadFile(path, blob);
  }
};
