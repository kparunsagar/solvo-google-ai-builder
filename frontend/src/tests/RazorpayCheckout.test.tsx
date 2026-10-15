import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateRazorpayPayment, RazorpayState, loadRazorpayScript } from '../services/razorpay.service';

// Polyfills for Node vitest runner
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => ({
      src: '',
      async: false,
      onload: null as any,
      onerror: null as any
    }),
    body: {
      appendChild: (el: any) => {
        if (el.onload) setTimeout(el.onload, 10);
      }
    },
    querySelector: () => null
  };
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k)
  };
}

describe('Razorpay Standard Checkout Test Mode — End-to-End Suite', () => {
  let mockRazorpayInstance: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockRazorpayInstance = {
      options: null as any,
      open: vi.fn(),
      on: vi.fn()
    };

    (window as any).Razorpay = function (this: any, options: any) {
      mockRazorpayInstance.options = options;
      return mockRazorpayInstance;
    };
  });

  afterEach(() => {
    delete (window as any).Razorpay;
  });

  // ─── Test 1: Valid Payment Flow ─────────────────────────────────────────────
  it('calls create-order with booking_id only, opens Razorpay checkout, and verifies signature', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, init: any) => {
      const urlStr = String(url);

      if (urlStr.includes('/payments/razorpay/create-order')) {
        const body = JSON.parse(init.body);
        // Verify booking_id is passed and no amount is dictated by client
        expect(body.booking_id).toBe('book-test-101');
        expect(body.amount).toBeUndefined();

        return new Response(JSON.stringify({
          success: true,
          data: {
            order_id: 'order_test_987654',
            amount: 499,
            amount_paise: 49900,
            currency: 'INR',
            key_id: 'rzp_test_1DP5mmOlF5G5ag'
          }
        }), { status: 201 });
      }

      if (urlStr.includes('/payments/razorpay/verify')) {
        const body = JSON.parse(init.body);
        expect(body.order_id).toBe('order_test_987654');
        expect(body.payment_id).toBe('pay_test_abc123');
        expect(body.signature).toBe('valid_hmac_sig_test');
        expect(body.booking_id).toBe('book-test-101');

        return new Response(JSON.stringify({
          success: true,
          data: {
            signature_valid: true,
            payment_status: 'pending',
            booking_status: 'COMPLETED',
            note: 'Payment status is finalized strictly upon receipt of verified Razorpay webhook'
          }
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const states: RazorpayState[] = [];
    let successResult: any = null;

    await initiateRazorpayPayment({
      bookingId: 'book-test-101',
      customerName: 'Aarav Sharma',
      customerPhone: '9845123456',
      onStateChange: (state) => states.push(state),
      onSuccess: (res) => { successResult = res; }
    });

    expect(mockRazorpayInstance.open).toHaveBeenCalled();
    const rzpOptions = mockRazorpayInstance.options;

    // Verify amount and order_id come from server response
    expect(rzpOptions.amount).toBe(49900);
    expect(rzpOptions.order_id).toBe('order_test_987654');
    expect(rzpOptions.key).toBeDefined();
    // Key secret must NEVER be exposed or in options
    expect(rzpOptions.secret).toBeUndefined();
    expect(rzpOptions.key_secret).toBeUndefined();

    // Simulate customer successfully completing payment inside Razorpay modal
    await rzpOptions.handler({
      razorpay_payment_id: 'pay_test_abc123',
      razorpay_order_id: 'order_test_987654',
      razorpay_signature: 'valid_hmac_sig_test'
    });

    expect(successResult).not.toBeNull();
    expect(successResult.paymentId).toBe('pay_test_abc123');

    // Verify progression includes verifying and payment_pending states
    const statusSequence = states.map((s) => s.status);
    expect(statusSequence).toContain('creating_order');
    expect(statusSequence).toContain('popup_open');
    expect(statusSequence).toContain('verifying');
    expect(statusSequence).toContain('payment_pending');
  });

  // ─── Test 2: Tampered Signature Rejection ───────────────────────────────────
  it('handles server signature verification failure and sets failed state', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/payments/razorpay/create-order')) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            order_id: 'order_test_tamper_1',
            amount_paise: 29900,
            currency: 'INR'
          }
        }), { status: 201 });
      }

      if (urlStr.includes('/payments/razorpay/verify')) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Invalid signature. Payment verification check failed.' }
        }), { status: 400 });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const states: RazorpayState[] = [];
    let failureError: any = null;

    await initiateRazorpayPayment({
      bookingId: 'book-test-tamper',
      onStateChange: (state) => states.push(state),
      onFailure: (err) => { failureError = err; }
    });

    const rzpOptions = mockRazorpayInstance.options;
    // Simulate handler with tampered signature
    await rzpOptions.handler({
      razorpay_payment_id: 'pay_tampered_123',
      razorpay_order_id: 'order_test_tamper_1',
      razorpay_signature: 'fake_tampered_signature_hex'
    });

    expect(failureError).not.toBeNull();
    expect(failureError.code).toBe('VERIFICATION_FAILED');
    expect(states[states.length - 1].status).toBe('failed');
    expect(states[states.length - 1].message).toContain('Invalid signature');
  });

  // ─── Test 3: Popup Closed by User (modal.ondismiss) ─────────────────────────
  it('handles user closing the Razorpay modal without throwing a fatal crash', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('/payments/razorpay/create-order')) {
        return new Response(JSON.stringify({
          success: true,
          data: { order_id: 'order_test_close', amount_paise: 19900 }
        }), { status: 201 });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const states: RazorpayState[] = [];
    let dismissedCalled = false;

    await initiateRazorpayPayment({
      bookingId: 'book-test-dismiss',
      onStateChange: (state) => states.push(state),
      onDismiss: () => { dismissedCalled = true; }
    });

    const rzpOptions = mockRazorpayInstance.options;
    expect(rzpOptions.modal).toBeDefined();
    expect(typeof rzpOptions.modal.ondismiss).toBe('function');

    // Simulate user closing the Razorpay window
    rzpOptions.modal.ondismiss();

    expect(dismissedCalled).toBe(true);
    expect(states[states.length - 1].status).toBe('popup_closed');
    expect(states[states.length - 1].message).toContain('closed');
  });

  // ─── Test 4: Failed Payment Event (payment.failed) ──────────────────────────
  it('handles bank declined or payment failed event gracefully', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('/payments/razorpay/create-order')) {
        return new Response(JSON.stringify({
          success: true,
          data: { order_id: 'order_test_declined', amount_paise: 39900 }
        }), { status: 201 });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const states: RazorpayState[] = [];
    let failureError: any = null;

    let failedEventHandler: ((resp: any) => void) | null = null;
    mockRazorpayInstance.on = vi.fn().mockImplementation((event: string, callback: any) => {
      if (event === 'payment.failed') {
        failedEventHandler = callback;
      }
    });

    await initiateRazorpayPayment({
      bookingId: 'book-test-decline',
      onStateChange: (state) => states.push(state),
      onFailure: (err) => { failureError = err; }
    });

    expect(failedEventHandler).not.toBeNull();
    // Simulate Razorpay payment.failed event from bank
    failedEventHandler!({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Payment was declined by issuing bank due to insufficient funds'
      }
    });

    expect(failureError).toBeDefined();
    expect(states[states.length - 1].status).toBe('failed');
    expect(states[states.length - 1].message).toContain('insufficient funds');
  });

  // ─── Test 5: Script Loading and Safety ──────────────────────────────────────
  it('loadRazorpayScript returns true if window.Razorpay already exists', async () => {
    (window as any).Razorpay = vi.fn();
    const loaded = await loadRazorpayScript();
    expect(loaded).toBe(true);
  });
});
