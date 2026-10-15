import { db } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';
import { MatchingService } from '../modules/matching/matching.service.js';
import { PricingService } from '../modules/pricing/pricing.service.js';
import { BookingService } from '../modules/booking/booking.service.js';
import { PaymentService } from '../modules/payment/payment.service.js';
import { config } from '../config.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING SAGARA SERVICES TEST SUITE');
  console.log('========================================\n');

  // Re-seed clean test environment
  seedDatabase();

  // ----------------------------------------------------
  // TEST 1: Matching Engine Distance & Scoring
  // ----------------------------------------------------
  console.log('Test Suite 1: Matching Engine (Sagara Coordinates)');
  // Distance between Gandhi Nagar (14.1670, 75.0298) and Keladi Road (14.1750, 75.0340)
  const dist = MatchingService.calculateDistanceKm(14.1670, 75.0298, 14.1750, 75.0340);
  assert(dist > 0 && dist < 2, `Haversine distance between Gandhi Nagar and Keladi is ~1.0 km (got ${dist} km)`);

  // Find eligible plumbers in Gandhi Nagar
  const plumbers = MatchingService.findEligibleProviders('cat-plumbing', 14.1670, 75.0298, 15);
  assert(plumbers.length > 0, `Matching engine returns eligible verified plumbers (found ${plumbers.length})`);
  assert(plumbers[0].user.name === 'Manjunath K', `Top matched plumber is Manjunath K (Score: ${plumbers[0].score})`);

  // Verify pending KYC provider is NOT returned by matching engine
  const electricians = MatchingService.findEligibleProviders('cat-electrical', 14.1670, 75.0298, 15);
  const pendingIncluded = electricians.some((e) => e.provider.kyc_status === 'pending');
  assert(!pendingIncluded, 'Providers with pending KYC are strictly excluded from job matching');

  // ----------------------------------------------------
  // TEST 2: Pricing Engine Breakdown
  // ----------------------------------------------------
  console.log('\nTest Suite 2: Dynamic Pricing Engine');
  // Base 349, parts 150
  const pricing = PricingService.calculatePricing(349, 150);
  assert(pricing.baseAmount === 349, 'Base amount preserved');
  assert(pricing.partsMaterialsAmount === 150, 'Parts amount preserved');
  assert(pricing.platformCommissionAmount === Math.round(349 * config.platformCommissionRate), '20% platform commission calculated on service');
  assert(pricing.gstAmount === Math.round(pricing.platformCommissionAmount * 0.18), '18% GST calculated on platform fee');
  assert(
    pricing.totalAmount === pricing.subtotal + pricing.gstAmount,
    `Customer total equals subtotal + GST (${pricing.totalAmount})`
  );

  // ----------------------------------------------------
  // TEST 3: Real-Time 8-Stage Booking Lifecycle State Machine
  // ----------------------------------------------------
  console.log('\nTest Suite 3: 8-Stage Booking Lifecycle & Security');
  const customer = db.users.find((u) => u.role === 'customer')!;
  const plumberUser = db.users.find((u) => u.name === 'Manjunath K')!;

  // 1. Customer creates booking
  const { booking } = BookingService.createBooking({
    customerId: customer.id,
    serviceId: 'srv-plumb-tap',
    addressLocality: 'Gandhi Nagar, Sagara',
    addressText: 'House 42/B, 2nd Cross',
    addressLat: 14.1670,
    addressLng: 75.0298,
    customerNotes: 'Main kitchen sink tap is continuously leaking'
  });

  assert(booking.status === 'PROVIDER_MATCHED', `Booking created and matched (Status: ${booking.status})`);
  assert(!!booking.otp && booking.otp.length === 4, `Customer received 4-digit arrival OTP (${booking.otp})`);
  assert(booking.provider_id === plumberUser.id, 'Assigned to top matched provider');

  // 2. Provider accepts
  const accepted = await BookingService.acceptBooking(booking.id, plumberUser.id);
  assert(accepted.status === 'ACCEPTED', 'Status transitioned to ACCEPTED');

  // 2b. Provider attempts to accept another concurrent job -> must fail under single-job policy
  const { booking: secondBooking } = BookingService.createBooking({
    customerId: customer.id,
    serviceId: 'srv-plumb-tap',
    addressLocality: 'Keladi, Sagara',
    addressText: 'Near Temple Road'
  });
  let concurrentAcceptBlocked = false;
  try {
    await BookingService.acceptBooking(secondBooking.id, plumberUser.id);
  } catch (err: any) {
    concurrentAcceptBlocked = true;
  }
  assert(concurrentAcceptBlocked, 'Single-Job Policy: Provider blocked from accepting second job while first is active');

  // 3. Provider on the way
  const onTheWay = BookingService.markOnTheWay(booking.id, plumberUser.id);
  assert(onTheWay.status === 'ON_THE_WAY', 'Status transitioned to ON_THE_WAY');

  // 4. Provider arrives with WRONG OTP -> must fail
  let wrongOtpCaught = false;
  try {
    BookingService.markArrived(booking.id, plumberUser.id, '0000');
  } catch (err: any) {
    wrongOtpCaught = true;
  }
  assert(wrongOtpCaught, 'Arrival rejected when provider supplies wrong OTP');

  // 5. Provider arrives with CORRECT OTP -> succeeds
  const arrived = BookingService.markArrived(booking.id, plumberUser.id, booking.otp);
  assert(arrived.status === 'ARRIVED', 'Status transitioned to ARRIVED upon valid OTP');

  // 6. Provider starts work
  const inProgress = BookingService.startService(booking.id, plumberUser.id);
  assert(inProgress.status === 'SERVICE_IN_PROGRESS', 'Status transitioned to SERVICE_IN_PROGRESS');

  // 7. Provider adds extra parts (new PVC coupling ₹120)
  const withParts = BookingService.addPartsAmount(booking.id, plumberUser.id, 120, 'Heavy-duty brass spindle & teflon');
  assert(withParts.parts_materials_amount === 120, 'Spare parts amount recorded');
  assert(withParts.total_amount > booking.base_amount, 'Total invoice updated with parts');

  // 8. Provider completes service
  const completed = BookingService.completeService(booking.id, plumberUser.id);
  assert(completed.status === 'COMPLETED', 'Status transitioned to COMPLETED');

  // ----------------------------------------------------
  // TEST 4: Payment Webhook Cryptographic Verification
  // ----------------------------------------------------
  console.log('\nTest Suite 4: Payment Gateway HMAC-SHA256 Webhook');
  const paymentOrder = PaymentService.createPaymentOrder(completed, 'upi');
  assert(paymentOrder.status === 'pending', 'Payment order created with pending status');

  const mockGatewayPaymentId = 'pay_rzp_test_9921';

  // Forged signature test
  const forgedResult = await PaymentService.processWebhook({
    orderId: paymentOrder.gateway_order_id,
    gatewayPaymentId: mockGatewayPaymentId,
    signature: 'forged_fake_signature_attempt'
  });
  assert(!forgedResult.success, 'Tampered/forged webhook signature is rejected');

  // Genuine HMAC-SHA256 signature test
  const validSignature = PaymentService.generateSignature(
    paymentOrder.gateway_order_id,
    mockGatewayPaymentId,
    config.paymentSecret
  );

  const genuineResult = await PaymentService.processWebhook({
    orderId: paymentOrder.gateway_order_id,
    gatewayPaymentId: mockGatewayPaymentId,
    signature: validSignature
  });
  assert(genuineResult.success, 'Valid HMAC-SHA256 webhook signature verified');
  assert(genuineResult.booking?.status === 'PAYMENT_CONFIRMED', 'Booking transitioned to PAYMENT_CONFIRMED');
  assert(genuineResult.payment?.signature_verified === true, 'Payment record marked as signature_verified');

  // ----------------------------------------------------
  // TEST 5: Customer Rating & Review
  // ----------------------------------------------------
  console.log('\nTest Suite 5: Customer Review & Rating Aggregation');
  const reviewed = BookingService.submitReview({
    bookingId: booking.id,
    customerId: customer.id,
    rating: 5,
    comment: 'Manjunath arrived quickly in Gandhi Nagar and fixed the tap in 20 minutes. Highly recommended!',
    tags: ['Punctual', 'Expert Work', 'Fair Pricing']
  });
  assert(reviewed.status === 'REVIEWED', 'Booking reached final terminal status REVIEWED');

  const finalProvider = db.providers.find((p) => p.user_id === plumberUser.id);
  assert(Boolean(finalProvider && finalProvider.total_reviews > 0), 'Provider review count updated');

  // ----------------------------------------------------
  // TEST 6: Customer Order Cancellation
  // ----------------------------------------------------
  console.log('\nTest Suite 6: Customer Order Cancellation');
  const { booking: cancelTarget } = BookingService.createBooking({
    customerId: customer.id,
    serviceId: 'srv-plumb-tap',
    addressLocality: 'Gandhi Nagar',
    addressText: 'Near Bus Stand, Sagara',
    addressLat: 14.1670,
    addressLng: 75.0300
  });
  assert(cancelTarget.status === 'PROVIDER_MATCHED' || cancelTarget.status === 'REQUESTED', 'New booking created for cancellation test');

  const cancelledBooking = BookingService.cancelBooking({
    bookingId: cancelTarget.id,
    cancelledBy: customer.id,
    reason: 'Technician delayed / taking too long',
    notes: 'Waited 30 mins'
  });
  assert(cancelledBooking.status === 'CANCELLED', 'Booking status transitioned to CANCELLED');
  assert(cancelledBooking.cancellation_reason === 'Technician delayed / taking too long', 'Cancellation reason correctly recorded');

  // Verify that a completed/reviewed booking cannot be cancelled
  try {
    BookingService.cancelBooking({
      bookingId: booking.id, // already REVIEWED
      reason: 'Should fail'
    });
    assert(false, 'Should throw error when attempting to cancel reviewed booking');
  } catch (err: any) {
    assert(true, 'Properly prevented cancellation of reviewed booking');
  }

  // ----------------------------------------------------
  // RESULTS SUMMARY
  // ----------------------------------------------------
  console.log('\n========================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
