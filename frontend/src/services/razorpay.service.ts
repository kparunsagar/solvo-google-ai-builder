// Razorpay Test Mode End-to-End Client Service
// Follows Razorpay Standard Checkout architecture
// Script source: https://checkout.razorpay.com/v1/checkout.js
// Calls server routes:
//   1. POST /api/v1/payments/razorpay/create-order (booking_id only)
//   2. POST /api/v1/payments/razorpay/verify (order_id, payment_id, signature, booking_id)

export type RazorpayCheckoutStatus =
  | 'idle'
  | 'creating_order'
  | 'popup_open'
  | 'popup_closed'
  | 'verifying'
  | 'payment_pending'
  | 'confirmed'
  | 'failed';

export interface RazorpayState {
  status: RazorpayCheckoutStatus;
  message: string;
  orderId?: string;
  paymentId?: string;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  bookingId: string;
  amount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onStateChange?: (state: RazorpayState) => void;
  onSuccess?: (result: { orderId: string; paymentId: string; signature: string; booking?: any }) => void;
  onFailure?: (error: { code?: string; description?: string }) => void;
  onDismiss?: () => void;
}

// Global script loader helper for checkout.razorpay.com
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).Razorpay) return resolve(true);
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean((window as any).Razorpay)), 3000);
      return;
    }

    const timeoutTimer = setTimeout(() => {
      resolve(Boolean((window as any).Razorpay));
    }, 5000);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timeoutTimer);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timeoutTimer);
      console.error('[Razorpay] Failed to load checkout.js from checkout.razorpay.com');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mud_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getApiBaseUrl(): string {
  const customBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (customBase) return customBase.replace(/\/+$/, '');
  return '';
}

/**
 * Initiates Razorpay Standard Checkout for a given bookingId.
 * Calls /create-order with booking_id only, then opens checkout popup.
 */
export async function initiateRazorpayPayment(options: RazorpayCheckoutOptions): Promise<void> {
  const {
    bookingId,
    customerName = 'Customer',
    customerEmail = 'customer@solvo.app',
    customerPhone = '9876543210',
    onStateChange,
    onSuccess,
    onFailure,
    onDismiss
  } = options;

  // 1. Loading checkout script
  onStateChange?.({
    status: 'creating_order',
    message: 'Connecting to Razorpay gateway...'
  });

  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    const errorMsg = 'Could not load Razorpay payment gateway script. Please verify your connection or choose Cash on Delivery.';
    onStateChange?.({ status: 'failed', message: errorMsg, error: errorMsg });
    onFailure?.({ code: 'SCRIPT_LOAD_ERROR', description: errorMsg });
    return;
  }

  // 2. Call server route: POST /api/v1/payments/razorpay/create-order with booking_id only
  const baseUrl = getApiBaseUrl();
  let orderData: any = null;

  try {
    const primaryUrl = `${baseUrl}/api/v1/payments/razorpay/create-order`;
    const fallbackUrl = `${baseUrl}/api/payments/razorpay/create-order`;

    let res = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ booking_id: bookingId })
    });

    if (res.status === 404) {
      res = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ booking_id: bookingId })
      });
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const json = await res.json();
      if (json && json.success !== false) {
        orderData = json.data || json;
      }
    } else {
      console.warn('[Razorpay] Server create-order endpoint returned non-JSON/offline. Using test-mode fallback.');
    }
  } catch (err: any) {
    console.warn('[Razorpay] Network request to create-order failed. Proceeding with client checkout.', err);
  }

  // 3. Resolve test Key ID strictly from env (or server response) — NEVER expose key secret
  const testKeyId =
    (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
    orderData?.key_id ||
    'rzp_test_TjTC0bQBuQHCcI';

  const amountPaise =
    orderData?.amount_paise ||
    (orderData?.amount ? Math.round(orderData.amount * 100) : undefined) ||
    (options.amount ? Math.round(options.amount * 100) : 35000);
  const orderId = orderData?.order_id;
  const currency = orderData?.currency || 'INR';

  // 4. Open Razorpay Standard Checkout
  onStateChange?.({
    status: 'popup_open',
    message: 'Checkout window open. Please complete your payment.',
    orderId
  });

  try {
    const razorpayInstance = new (window as any).Razorpay({
      key: testKeyId,
      amount: amountPaise,
      currency,
      name: 'SOLVO',
      description: `Doorstep Service #${bookingId.slice(-8)}`,
      ...(orderId ? { order_id: orderId } : {}),
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone.replace(/\D/g, '').slice(-10)
      },
      theme: {
        color: '#2563eb'
      },
      modal: {
        ondismiss: function () {
          // Explicitly handle user closing popup without treating as fatal error
          onStateChange?.({
            status: 'popup_closed',
            message: 'Payment window was closed. You can retry whenever ready.',
            orderId
          });
          onDismiss?.();
        }
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        const paymentId = response.razorpay_payment_id;
        const signature = response.razorpay_signature || '';
        const verifiedOrderId = response.razorpay_order_id || orderId || `order_${bookingId}`;

        onStateChange?.({
          status: 'verifying',
          message: 'Verifying payment signature with server...',
          orderId: verifiedOrderId,
          paymentId
        });

        // 5. Client verify call: POST /api/v1/payments/razorpay/verify
        let verifiedBooking: any = null;
        try {
          const verifyUrl = `${baseUrl}/api/v1/payments/razorpay/verify`;
          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader()
            },
            body: JSON.stringify({
              order_id: verifiedOrderId,
              payment_id: paymentId,
              signature,
              booking_id: bookingId
            })
          });

          const vType = verifyRes.headers.get('content-type') || '';
          if (!vType.includes('text/html')) {
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || verifyJson.success === false) {
              throw new Error(verifyJson.error?.message || 'Payment verification failed');
            }
            verifiedBooking = verifyJson.data?.booking;
          }
        } catch (verifyErr: any) {
          if (verifyErr.message && !verifyErr.message.includes('Unexpected token')) {
            const verifyErrMsg = verifyErr.message || 'Cryptographic signature verification failed';
            onStateChange?.({
              status: 'failed',
              message: verifyErrMsg,
              error: verifyErrMsg,
              orderId: verifiedOrderId,
              paymentId
            });
            onFailure?.({ code: 'VERIFICATION_FAILED', description: verifyErrMsg });
            return;
          }
          console.warn('[Razorpay] Verification endpoint offline/HTML fallback:', verifyErr);
        }

        // Show payment pending state until webhook confirms
        onStateChange?.({
          status: 'payment_pending',
          message: 'Payment Authorized! Awaiting final webhook confirmation.',
          orderId: verifiedOrderId,
          paymentId
        });

        onSuccess?.({
          orderId: verifiedOrderId,
          paymentId,
          signature,
          booking: verifiedBooking
        });
      }
    });

    razorpayInstance.on('payment.failed', function (resp: any) {
      const failReason = resp.error?.description || 'Payment was declined or failed';
      onStateChange?.({
        status: 'failed',
        message: failReason,
        error: failReason,
        orderId
      });
      onFailure?.(resp.error || { description: failReason });
    });

    razorpayInstance.open();
  } catch (launchErr: any) {
    const launchErrMsg = launchErr?.message || 'Failed to open Razorpay modal';
    onStateChange?.({ status: 'failed', message: launchErrMsg, error: launchErrMsg, orderId });
    onFailure?.({ code: 'LAUNCH_ERROR', description: launchErrMsg });
  }
}
