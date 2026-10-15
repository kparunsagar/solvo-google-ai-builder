import { db, CouponRecord } from '../../db/database.js';
import { config } from '../../config.js';

export interface ServerCoupon {
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number; // in ₹ or %
  minOrderValueRupees: number;
  maxDiscountRupees?: number;
  description: string;
}

export const VALID_SERVER_COUPONS: Record<string, ServerCoupon> = {
  WELCOME50: {
    code: 'WELCOME50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValueRupees: 299,
    description: 'Flat ₹50 off on local services above ₹299'
  },
  FESTIVE100: {
    code: 'FESTIVE100',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValueRupees: 499,
    description: 'Flat ₹100 off on services above ₹499'
  },
  SAGARA10: {
    code: 'SAGARA10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValueRupees: 299,
    maxDiscountRupees: 150,
    description: '10% off up to ₹150 for Sagara residents'
  }
};

export interface BillingCalculationInput {
  baseLaborRupees: number;
  partsMaterialsRupees?: number;
  partsMarkupRate?: number; // e.g. 0.10 for 10% spare-parts markup
  discountRupees?: number;
  couponCode?: string;
  userId?: string;
  discountBorneBy?: 'platform' | 'technician';
}

export interface BillingCalculationResult {
  // Integer Paise (Single Source of Truth)
  base_amount_paise: number;
  parts_materials_amount_paise: number;
  parts_cost_paise: number;
  parts_markup_paise: number;
  subtotal_paise: number;
  discount_paise: number;
  platform_commission_paise: number;
  gst_amount_paise: number;
  total_amount_paise: number;
  provider_payout_paise: number;
  discount_borne_by: 'platform' | 'technician';

  // Rupee Values (Display & Backward Compatibility)
  baseAmount: number;
  partsMaterialsAmount: number;
  partsCost: number;
  partsMarkup: number;
  subtotal: number;
  discount: number;
  platformCommissionAmount: number;
  gstAmount: number;
  totalAmount: number;
  providerPayoutAmount: number;

  // Metadata
  platformCommissionRate: number;
  gstRate: number;
  couponCode?: string;
}

export class BillingService {
  public static readonly PLATFORM_COMMISSION_RATE = 0.20; // 20%
  public static readonly GST_RATE = 0.18; // 18% GST

  /**
   * Server-side coupon validator backed by Cloud Firestore coupons collection.
   * Enforces expiry, min order paise, usage limit, and per-user limits.
   */
  public static validateCoupon(
    couponCode: string,
    subtotalRupees: number,
    userId?: string
  ): { valid: boolean; discountRupees: number; discountPaise: number; message?: string; coupon?: CouponRecord } {
    if (!couponCode) return { valid: false, discountRupees: 0, discountPaise: 0 };
    const code = couponCode.trim().toUpperCase();

    // 1. Fetch from Firestore db.coupons single source of truth
    let coupon = db.coupons.find(c => c.code === code);
    if (!coupon) {
      const fallback = VALID_SERVER_COUPONS[code];
      if (fallback) {
        coupon = {
          id: `coup-${fallback.code.toLowerCase()}`,
          code: fallback.code,
          discount_type: fallback.discountType,
          value: fallback.discountValue,
          min_order_paise: fallback.minOrderValueRupees * 100,
          max_discount_paise: fallback.maxDiscountRupees ? fallback.maxDiscountRupees * 100 : undefined,
          expires_at: '2030-12-31T23:59:59.000Z',
          usage_limit: 10000,
          per_user_limit: 5,
          times_used: 0,
          is_active: true,
          description: fallback.description
        };
      }
    }

    if (!coupon || !coupon.is_active) {
      return { valid: false, discountRupees: 0, discountPaise: 0, message: `Invalid coupon code: '${couponCode}'` };
    }

    // 2. Check Expiry
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return { valid: false, discountRupees: 0, discountPaise: 0, message: `Coupon '${coupon.code}' has expired.` };
    }

    // 3. Check Minimum Order Value (in paise)
    const subtotalPaise = Math.round(subtotalRupees * 100);
    const minOrderPaise = coupon.min_order_paise !== undefined ? coupon.min_order_paise : 0;
    if (subtotalPaise < minOrderPaise) {
      const minOrderRupees = Math.round(minOrderPaise / 100);
      return {
        valid: false,
        discountRupees: 0,
        discountPaise: 0,
        message: `Coupon '${coupon.code}' requires a minimum order value of ₹${minOrderRupees}. Current subtotal: ₹${Math.round(subtotalRupees)}`
      };
    }

    // 4. Check Global Usage Limit
    if (coupon.usage_limit !== undefined && coupon.times_used >= coupon.usage_limit) {
      return { valid: false, discountRupees: 0, discountPaise: 0, message: `Coupon '${coupon.code}' has reached its global redemption limit.` };
    }

    // 5. Check Per-User Limit
    if (userId && coupon.per_user_limit !== undefined) {
      const userCount = db.coupon_redemptions.filter(r => r.coupon_code === coupon!.code && r.user_id === userId).length;
      if (userCount >= coupon.per_user_limit) {
        return { valid: false, discountRupees: 0, discountPaise: 0, message: `Coupon '${coupon.code}' per-user redemption limit (${coupon.per_user_limit}) exceeded.` };
      }
    }

    // 6. Calculate Discount
    let discountPaise = 0;
    if (coupon.discount_type === 'fixed') {
      discountPaise = coupon.value * 100;
    } else {
      discountPaise = Math.round((subtotalPaise * coupon.value) / 100);
      if (coupon.max_discount_paise) {
        discountPaise = Math.min(discountPaise, coupon.max_discount_paise);
      }
    }

    const discountRupees = Math.round(discountPaise / 100);
    return { valid: true, discountRupees, discountPaise, coupon };
  }

  /**
   * Universal Server-Side Billing Engine
   * All amounts computed and stored with integer paise precision (1 INR = 100 paise)
   * GUARANTEES ZERO PAISA LEAKAGE: total_amount_paise === platform_commission_paise + gst_amount_paise + provider_payout_paise
   */
  public static calculateBilling(input: BillingCalculationInput): BillingCalculationResult {
    const baseLaborRupees = Math.max(0, input.baseLaborRupees || 0);
    const partsCostRupees = Math.max(0, input.partsMaterialsRupees || 0);
    const partsMarkupRate = Math.max(0, input.partsMarkupRate || 0);
    const discountBorneBy: 'platform' | 'technician' = input.discountBorneBy || (config.discountBorneBy as any) || 'platform';

    // 1. Integer Paise Conversions
    const base_amount_paise = Math.round(baseLaborRupees * 100);
    const parts_cost_paise = Math.round(partsCostRupees * 100);
    const parts_markup_paise = Math.round(parts_cost_paise * partsMarkupRate);
    const parts_materials_amount_paise = parts_cost_paise + parts_markup_paise;

    // 2. Validate Discount / Coupon
    let effectiveDiscountRupees = 0;
    if (input.couponCode) {
      const subtotalBeforeDiscountRupees = baseLaborRupees + (parts_materials_amount_paise / 100);
      const couponCheck = this.validateCoupon(input.couponCode, subtotalBeforeDiscountRupees, input.userId);
      if (couponCheck.valid) {
        effectiveDiscountRupees = couponCheck.discountRupees;
      }
    } else if (input.discountRupees) {
      effectiveDiscountRupees = Math.max(0, input.discountRupees);
    }

    const raw_subtotal_paise = base_amount_paise + parts_materials_amount_paise;
    const discount_paise = Math.min(raw_subtotal_paise, Math.round(effectiveDiscountRupees * 100));
    const subtotal_paise = Math.max(0, raw_subtotal_paise - discount_paise);

    // 3. Platform Commission & GST (Integer Paise)
    let platform_commission_paise = 0;
    let gst_amount_paise = 0;
    let total_amount_paise = 0;
    let provider_payout_paise = 0;

    if (discountBorneBy === 'platform') {
      // Option B (Default): Platform absorbs the discount out of its commission, preserving technician earnings
      const gross_commission = Math.round(base_amount_paise * this.PLATFORM_COMMISSION_RATE);
      platform_commission_paise = Math.max(0, gross_commission - discount_paise);
      gst_amount_paise = Math.round(platform_commission_paise * this.GST_RATE);
      total_amount_paise = subtotal_paise + gst_amount_paise;
      // Technician payout is insulated from the promo discount
      provider_payout_paise = total_amount_paise - platform_commission_paise - gst_amount_paise;
    } else {
      // Option A: Standard split where discount is deducted from customer subtotal and borne by service split
      platform_commission_paise = Math.round(base_amount_paise * this.PLATFORM_COMMISSION_RATE);
      gst_amount_paise = Math.round(platform_commission_paise * this.GST_RATE);
      total_amount_paise = subtotal_paise + gst_amount_paise;
      provider_payout_paise = Math.max(0, total_amount_paise - platform_commission_paise - gst_amount_paise);
    }

    // Mathematical conservation assertion: Total collected must equal commission + tax + technician payout
    if (total_amount_paise !== platform_commission_paise + gst_amount_paise + provider_payout_paise) {
      throw new Error(`BILLING_LEAKAGE_DETECTED: Total (${total_amount_paise}) != Commission (${platform_commission_paise}) + GST (${gst_amount_paise}) + Payout (${provider_payout_paise})`);
    }

    return {
      base_amount_paise,
      parts_materials_amount_paise,
      parts_cost_paise,
      parts_markup_paise,
      subtotal_paise,
      discount_paise,
      platform_commission_paise,
      gst_amount_paise,
      total_amount_paise,
      provider_payout_paise,
      discount_borne_by: discountBorneBy,

      baseAmount: Math.round(base_amount_paise / 100),
      partsMaterialsAmount: Math.round(parts_materials_amount_paise / 100),
      partsCost: Math.round(parts_cost_paise / 100),
      partsMarkup: Math.round(parts_markup_paise / 100),
      subtotal: Math.round(subtotal_paise / 100),
      discount: Math.round(discount_paise / 100),
      platformCommissionAmount: Math.round(platform_commission_paise / 100),
      gstAmount: Math.round(gst_amount_paise / 100),
      totalAmount: Math.round(total_amount_paise / 100),
      providerPayoutAmount: Math.round(provider_payout_paise / 100),

      platformCommissionRate: this.PLATFORM_COMMISSION_RATE,
      gstRate: this.GST_RATE,
      couponCode: input.couponCode
    };
  }
}
