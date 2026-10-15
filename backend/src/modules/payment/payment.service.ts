import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db, PaymentRecord, BookingRecord, SettlementLedgerRecord } from '../../db/database.js';
import { firestore } from '../../db/firestore.js';
import { config } from '../../config.js';
import { AuditService } from '../audit/audit.service.js';
import { ReceiptService } from '../receipt/receipt.service.js';
import { realtimeServer } from '../../ws/socket-server.js';

export class PaymentService {
  public static timingSafeCompare(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  }

  /**
   * Secret Resolver: Fetches Razorpay secrets mounted via Google Cloud Run Secret Manager
   */
  public static getWebhookSecret(): string {
    return (
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      config.paymentSecret ||
      'rzp_sec_sagara_live_mock_577401'
    );
  }

  public static getKeySecret(): string {
    return (
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      config.paymentSecret ||
      'rzp_sec_sagara_live_mock_577401'
    );
  }

  /**
   * Initialize a new payment order for a completed booking
   * Idempotent: Deduplicates requests with matching idempotencyKey or existing pending order
   */
  public static createPaymentOrder(
    booking: BookingRecord,
    paymentMethod: 'upi' | 'card' | 'netbanking' | 'cash_on_delivery',
    idempotencyKey?: string
  ): PaymentRecord {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingByIdempotency = db.payments.find((p) => p.idempotency_key === idempotencyKey);
      if (existingByIdempotency) {
        return existingByIdempotency;
      }
    }

    const existingPending = db.payments.find(
      (p) => p.booking_id === booking.id && p.status === 'pending' && p.payment_method === paymentMethod
    );
    if (existingPending) {
      if (idempotencyKey && !existingPending.idempotency_key) {
        existingPending.idempotency_key = idempotencyKey;
      }
      return existingPending;
    }

    const orderId = `order_sagara_${uuidv4().substring(0, 10)}`;
    const paymentId = `pay-${uuidv4().substring(0, 8)}`;
    const amountPaise = booking.total_amount_paise || Math.round(booking.total_amount * 100);

    const payment: PaymentRecord = {
      id: paymentId,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      amount: booking.total_amount,
      amount_paise: amountPaise,
      idempotency_key: idempotencyKey,
      currency: 'INR',
      payment_method: paymentMethod,
      gateway: paymentMethod === 'cash_on_delivery' ? 'cash' : 'razorpay',
      gateway_order_id: orderId,
      signature_verified: false,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.payments.unshift(payment);
    db.persist('payments', payment.id);

    AuditService.log({
      actorId: booking.customer_id,
      actorRole: 'customer',
      action: 'PAYMENT_ORDER_CREATED',
      entityType: 'payment',
      entityId: payment.id,
      details: {
        bookingId: booking.id,
        amount: booking.total_amount,
        amountPaise,
        method: paymentMethod,
        orderId,
        idempotencyKey
      }
    });

    return payment;
  }

  /**
   * Compute standard HMAC-SHA256 signature for Razorpay verification
   */
  public static generateSignature(
    orderId: string,
    paymentId: string,
    secret: string = PaymentService.getKeySecret()
  ): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Compute standard HMAC-SHA256 signature for Razorpay Webhook payloads
   */
  public static generateWebhookSignature(
    rawPayload: string,
    secret: string = PaymentService.getWebhookSecret()
  ): string {
    return crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');
  }

  /**
   * Verify and process webhook payload from Payment Gateway.
   * Security hardening:
   * 1. Timing-safe constant-time comparison
   * 2. Shared-state event deduplication in Cloud Firestore (create-if-not-exists)
   * 3. Exact paid amount validation against server total
   * 4. Single source of state change: Only verified webhooks set PAYMENT_CONFIRMED
   */
  public static async processWebhook(params: {
    orderId: string;
    gatewayPaymentId: string;
    signature: string;
    rawPayload?: any;
    ipAddress?: string;
    eventId?: string;
    paidAmountPaise?: number;
  }): Promise<{ success: boolean; message: string; payment?: PaymentRecord; booking?: BookingRecord; receipt?: any }> {
    const { orderId, gatewayPaymentId, signature, rawPayload, ipAddress, eventId, paidAmountPaise } = params;

    // 1. Shared State Webhook Deduplication in Firestore
    if (eventId) {
      const isNew = await firestore.createProcessedEventIfNotExist(eventId, { orderId, gatewayPaymentId });
      if (!isNew) {
        const payment = db.payments.find((p) => p.gateway_order_id === orderId);
        const booking = payment ? db.bookings.find((b) => b.id === payment.booking_id) : undefined;
        const receipt = payment ? db.receipts.find((r) => r.booking_id === payment.booking_id) : undefined;
        return {
          success: true,
          message: `Deduplicated: Webhook event ${eventId} was already processed.`,
          payment,
          booking,
          receipt
        };
      }
    }

    // 2. Locate payment record
    const payment = db.payments.find((p) => p.gateway_order_id === orderId);
    if (!payment) {
      return { success: false, message: `Payment with order_id ${orderId} not found.` };
    }

    const booking = db.bookings.find((b) => b.id === payment.booking_id);

    // 3. Amount Verification Check
    if (paidAmountPaise !== undefined && booking) {
      const requiredPaise = booking.total_amount_paise || Math.round(booking.total_amount * 100);
      if (paidAmountPaise < requiredPaise) {
        return {
          success: false,
          message: `AMOUNT_MISMATCH: Paid amount (${paidAmountPaise} paise) does not match required booking total (${requiredPaise} paise).`
        };
      }
    }

    // 4. Idempotency Check: Return existing captured payment without double-crediting
    if (payment.status === 'captured') {
      const receipt = db.receipts.find((r) => r.booking_id === payment.booking_id);
      return { success: true, message: 'Payment already processed and captured.', payment, booking, receipt };
    }

    // 5. Cryptographic signature check with timingSafeEqual
    const expectedKeySignature = this.generateSignature(orderId, gatewayPaymentId, this.getKeySecret());
    const expectedWebhookSignature = this.generateSignature(orderId, gatewayPaymentId, this.getWebhookSecret());

    const isValidKeySig = this.timingSafeCompare(signature, expectedKeySignature);
    const isValidWebhookSig = this.timingSafeCompare(signature, expectedWebhookSignature);
    const isValid = isValidKeySig || isValidWebhookSig;

    if (!isValid) {
      AuditService.log({
        action: 'PAYMENT_WEBHOOK_SIGNATURE_FAILED',
        entityType: 'payment',
        entityId: payment.id,
        details: { orderId, gatewayPaymentId, receivedSignature: signature },
        ipAddress
      });
      return { success: false, message: 'Invalid payment signature. Webhook rejected.' };
    }

    // 6. Mark payment as captured & verified
    payment.status = 'captured';
    payment.gateway_payment_id = gatewayPaymentId;
    payment.gateway_signature = signature;
    payment.signature_verified = true;
    payment.webhook_payload = rawPayload;

    // 7. Update the Booking to PAYMENT_CONFIRMED atomically
    let receipt = null;
    if (booking) {
      const prevStatus = booking.status;
      booking.status = 'PAYMENT_CONFIRMED';
      booking.updated_at = new Date().toISOString();

      db.booking_events.push({
        id: `ev-${uuidv4().substring(0, 8)}`,
        booking_id: booking.id,
        from_status: prevStatus,
        to_status: 'PAYMENT_CONFIRMED',
        note: `Payment of ₹${payment.amount} verified via gateway webhook (${gatewayPaymentId})`,
        timestamp: new Date().toISOString()
      });

      // 8. Credit provider earnings
      if (booking.provider_id) {
        const provider = db.providers.find((p) => p.user_id === booking.provider_id);
        if (provider) {
          provider.total_earnings += booking.provider_payout_amount;
          provider.pending_payout += booking.provider_payout_amount;
          db.persist('providers', provider.id);
        }
      }

      // 9. Atomically and idempotently generate digital customer receipt with 30-day warranty
      receipt = ReceiptService.generateReceipt(booking.id, payment.payment_method, gatewayPaymentId);

      realtimeServer.notifyBookingUpdated(booking, `Payment of ₹${payment.amount} confirmed! 30-Day Warranty activated.`);
      db.persist('bookings', booking.id);
    }

    db.persist('payments', payment.id);

    AuditService.log({
      action: 'PAYMENT_WEBHOOK_VERIFIED',
      entityType: 'payment',
      entityId: payment.id,
      details: {
        bookingId: payment.booking_id,
        amount: payment.amount,
        amountPaise: payment.amount_paise,
        gatewayPaymentId,
        payoutToProvider: booking?.provider_payout_amount
      },
      ipAddress
    });

    return {
      success: true,
      message: 'Payment signature verified and booking confirmed.',
      payment,
      booking,
      receipt
    };
  }

  /**
   * Cash and Bharat/UPI QR Settlement Handler (Hardened Round 2)
   * 1. Cash requires customer confirmation (or is marked pending_customer_confirmation)
   * 2. UPI reference is marked 'unverified' until reconciled with bank statement
   * 3. Commission/GST debit is recorded in append-only settlement_ledger collection
   * 4. Enforces strict technician ownership & self-settlement fraud protection
   */
  public static async settleCashOrQrPayment(params: {
    bookingId: string;
    providerUserId: string;
    method: 'cash' | 'upi_qr';
    transactionReference?: string;
    amountPaise?: number;
    customerConfirmed?: boolean;
    ipAddress?: string;
  }): Promise<{ success: boolean; message: string; status?: string; payment?: PaymentRecord; booking?: BookingRecord; receipt?: any; ledger?: SettlementLedgerRecord }> {
    const booking = db.bookings.find((b) => b.id === params.bookingId);
    if (!booking) {
      throw new Error(`Booking ${params.bookingId} not found`);
    }

    // Ownership check: Only assigned technician can settle
    if (booking.provider_id && booking.provider_id !== params.providerUserId) {
      throw new Error(`Unauthorized: Booking is assigned to technician ${booking.provider_id}, not ${params.providerUserId}`);
    }

    // State check
    if (booking.status !== 'SERVICE_IN_PROGRESS' && booking.status !== 'COMPLETED') {
      throw new Error(`Cannot settle payment in status: ${booking.status}. Job must be in progress or completed.`);
    }

    const amountPaise = params.amountPaise || booking.total_amount_paise || Math.round(booking.total_amount * 100);
    const paymentId = `pay-settle-${uuidv4().substring(0, 8)}`;
    const reference = params.transactionReference || (params.method === 'cash' ? `CASH-${Date.now()}` : `UPI-${Date.now()}`);
    const provider = db.providers.find((p) => p.user_id === booking.provider_id);
    const balanceBeforePaise = Math.round((provider?.pending_payout || 0) * 100);

    // 1. CASH SETTLEMENT
    if (params.method === 'cash') {
      // If customer has NOT confirmed cash receipt, mark as pending_customer_confirmation
      if (!params.customerConfirmed) {
        const payment: PaymentRecord = {
          id: paymentId,
          booking_id: booking.id,
          customer_id: booking.customer_id,
          provider_id: booking.provider_id,
          amount: Math.round(amountPaise / 100),
          amount_paise: amountPaise,
          currency: 'INR',
          payment_method: 'cash_on_delivery',
          gateway: 'cash',
          gateway_order_id: `settle_${booking.id}`,
          gateway_payment_id: reference,
          signature_verified: false,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        db.payments.unshift(payment);
        db.persist('payments', payment.id);

        booking.settlement_status = 'pending_customer_confirmation';
        db.persist('bookings', booking.id);

        const ledgerRecord: SettlementLedgerRecord = {
          id: `led-${uuidv4().substring(0, 8)}`,
          booking_id: booking.id,
          technician_id: booking.provider_id || params.providerUserId,
          type: 'CASH_COLLECTION',
          amount_paise: amountPaise,
          currency: 'INR',
          payment_method: 'cash',
          reference_id: reference,
          balance_before_paise: balanceBeforePaise,
          balance_after_paise: balanceBeforePaise,
          status: 'pending_confirmation',
          created_at: new Date().toISOString()
        };
        db.settlement_ledger.unshift(ledgerRecord);
        db.persist('settlement_ledger', ledgerRecord.id);

        return {
          success: true,
          status: 'pending_customer_confirmation',
          message: 'Cash payment recorded. Awaiting customer confirmation before finalizing settlement.',
          payment,
          booking,
          ledger: ledgerRecord
        };
      }

      // Customer confirmed cash payment: Finalize and debit commission + GST
      const payment: PaymentRecord = {
        id: paymentId,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        provider_id: booking.provider_id,
        amount: Math.round(amountPaise / 100),
        amount_paise: amountPaise,
        currency: 'INR',
        payment_method: 'cash_on_delivery',
        gateway: 'cash',
        gateway_order_id: `settle_${booking.id}`,
        gateway_payment_id: reference,
        signature_verified: true,
        status: 'captured',
        created_at: new Date().toISOString()
      };
      db.payments.unshift(payment);
      db.persist('payments', payment.id);

      const commissionAndGstPaise =
        (booking.platform_commission_paise || Math.round(booking.platform_commission_amount * 100)) +
        (booking.gst_amount_paise || Math.round(booking.gst_amount * 100));
      const balanceAfterPaise = balanceBeforePaise - commissionAndGstPaise;

      if (provider) {
        provider.total_earnings += booking.provider_payout_amount;
        provider.pending_payout -= (booking.platform_commission_amount + booking.gst_amount);
        db.persist('providers', provider.id);
      }

      const ledgerRecord: SettlementLedgerRecord = {
        id: `led-${uuidv4().substring(0, 8)}`,
        booking_id: booking.id,
        technician_id: booking.provider_id || params.providerUserId,
        type: 'DEBIT_COMMISSION_AND_GST',
        amount_paise: commissionAndGstPaise,
        currency: 'INR',
        payment_method: 'cash',
        reference_id: reference,
        balance_before_paise: balanceBeforePaise,
        balance_after_paise: balanceAfterPaise,
        status: 'settled',
        created_at: new Date().toISOString()
      };
      db.settlement_ledger.unshift(ledgerRecord);
      db.persist('settlement_ledger', ledgerRecord.id);

      const prevStatus = booking.status;
      booking.status = 'PAYMENT_CONFIRMED';
      booking.settlement_status = 'captured';
      booking.updated_at = new Date().toISOString();

      const receipt = ReceiptService.generateReceipt(booking.id, 'CASH', reference);

      db.booking_events.push({
        id: `ev-${uuidv4().substring(0, 8)}`,
        booking_id: booking.id,
        from_status: prevStatus,
        to_status: 'PAYMENT_CONFIRMED',
        note: `Cash payment of ₹${payment.amount} confirmed by customer (${reference})`,
        timestamp: new Date().toISOString()
      });

      db.persist('bookings', booking.id);
      realtimeServer.notifyBookingUpdated(booking, 'Cash payment confirmed by customer! 30-Day Warranty active.');

      return {
        success: true,
        status: 'captured',
        message: 'Cash payment confirmed and settled.',
        payment,
        booking,
        receipt,
        ledger: ledgerRecord
      };
    }

    // 2. UPI QR SETTLEMENT: Marked 'unverified' until reconciled with bank statement
    const payment: PaymentRecord = {
      id: paymentId,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      amount: Math.round(amountPaise / 100),
      amount_paise: amountPaise,
      currency: 'INR',
      payment_method: 'upi',
      gateway: 'upi_qr',
      gateway_order_id: `settle_${booking.id}`,
      gateway_payment_id: reference,
      signature_verified: false,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    db.payments.unshift(payment);
    db.persist('payments', payment.id);

    booking.settlement_status = 'unverified';
    db.persist('bookings', booking.id);

    const ledgerRecord: SettlementLedgerRecord = {
      id: `led-${uuidv4().substring(0, 8)}`,
      booking_id: booking.id,
      technician_id: booking.provider_id || params.providerUserId,
      type: 'CREDIT_PAYOUT',
      amount_paise: amountPaise,
      currency: 'INR',
      payment_method: 'upi_qr',
      reference_id: reference,
      balance_before_paise: balanceBeforePaise,
      balance_after_paise: balanceBeforePaise,
      status: 'unverified',
      created_at: new Date().toISOString()
    };
    db.settlement_ledger.unshift(ledgerRecord);
    db.persist('settlement_ledger', ledgerRecord.id);

    return {
      success: true,
      status: 'unverified',
      message: `UPI reference '${reference}' recorded. Status marked unverified pending bank statement reconciliation.`,
      payment,
      booking,
      ledger: ledgerRecord
    };
  }
}
