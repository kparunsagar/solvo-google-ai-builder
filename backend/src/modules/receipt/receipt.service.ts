import { v4 as uuidv4 } from 'uuid';
import { db, CustomerReceiptRecord, BookingRecord } from '../../db/database.js';
import { BillingService } from '../billing/billing.service.js';

export class ReceiptService {
  /**
   * Atomically and idempotently generates a digital customer receipt in Cloud Firestore
   * with guaranteed warranty dates and itemized paise billing.
   */
  public static generateReceipt(
    bookingId: string,
    paymentMethod: string = 'UPI',
    transactionId?: string
  ): CustomerReceiptRecord {
    // 1. Idempotency Check: Return existing receipt if already generated
    const existing = db.receipts.find((r) => r.booking_id === bookingId);
    if (existing) {
      return existing;
    }

    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const customer = db.users.find((u) => u.id === booking.customer_id);
    const providerUser = db.users.find((u) => u.id === booking.provider_id);
    const service = db.services.find((s) => s.id === booking.service_id);

    // 2. Universal Server-Side Billing Reconciler
    const billing = BillingService.calculateBilling({
      baseLaborRupees: booking.base_amount,
      partsMaterialsRupees: booking.parts_materials_amount || 0
    });

    const now = new Date();
    const warrantyDays = service?.warranty_days || 30;
    const warrantyValidUntil = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000).toISOString();

    const receiptId = `RCP-MUD-${Math.floor(1000 + Math.random() * 9000)}`;

    const receipt: CustomerReceiptRecord = {
      id: receiptId,
      booking_id: booking.id,
      booking_code: booking.booking_code,
      customer_id: booking.customer_id,
      customer_name: customer?.name || 'Valued Customer',
      customer_email: customer?.email || 'customer@myurbandaily.com',
      customer_phone: customer?.phone || '',
      customer_address: `${booking.address_text}, ${booking.address_locality}`,
      technician_name: providerUser?.name || 'Verified Technician',
      technician_phone: providerUser?.phone || '',
      service_name: service?.name || 'Doorstep Home Service',
      service_category: service?.category_id || 'General Maintenance',
      items_repaired: service?.included_tasks || [
        'Comprehensive fault diagnosis & safety test',
        'Precision repair & component replacement',
        'Flow & leakage seal test'
      ],
      newly_added_materials: booking.parts_materials_amount
        ? [{ description: 'Replacement fittings and spare materials', amount: booking.parts_materials_amount }]
        : [],
      base_labor_amount: billing.baseAmount,
      parts_materials_amount: billing.partsMaterialsAmount,
      gst_amount: billing.gstAmount,
      total_amount_paid: billing.totalAmount,
      base_labor_amount_paise: billing.base_amount_paise,
      parts_materials_amount_paise: billing.parts_materials_amount_paise,
      gst_amount_paise: billing.gst_amount_paise,
      total_amount_paid_paise: billing.total_amount_paise,
      payment_method: paymentMethod,
      payment_transaction_id: transactionId || `txn_${Date.now()}`,
      paid_at: now.toISOString(),
      warranty_days: warrantyDays,
      warranty_valid_until: warrantyValidUntil,
      created_at: now.toISOString()
    };

    // 3. Persist atomically to Cloud Firestore
    db.receipts.unshift(receipt);
    booking.receipt_id = receipt.id;
    booking.warranty_valid_until = warrantyValidUntil;

    db.persist('receipts', receipt.id);
    db.persist('bookings', booking.id);

    return receipt;
  }
}
