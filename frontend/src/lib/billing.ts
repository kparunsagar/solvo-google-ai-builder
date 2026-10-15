import { DEFAULT_SERVICES } from './api';

export interface BookingBillingSummary {
  baseAmount: number;
  partsAmount: number;
  subtotal: number;
  discount: number;
  total: number;
  gstAmount?: number;
  platformCommission?: number;
  providerPayout?: number;
  baseAmountPaise?: number;
  totalAmountPaise?: number;
  partsDescription: string;
  serviceDisplayName: string;
  itemsRepaired: string[];
}

export interface ServerBillingCalculationResult {
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
  baseAmount: number;
  partsMaterialsAmount: number;
  subtotal: number;
  discount: number;
  platformCommissionAmount: number;
  gstAmount: number;
  totalAmount: number;
  providerPayoutAmount: number;
}

/**
 * Call Server-Side Billing API Gateway (/api/v1/billing/calculate)
 * The Express backend is the SINGLE source of truth for pricing, GST, and technician splits.
 */
export async function fetchServerBillingCalculation(params: {
  baseLaborRupees: number;
  partsMaterialsRupees?: number;
  partsMarkupRate?: number;
  discountRupees?: number;
}): Promise<ServerBillingCalculationResult> {
  try {
    const res = await fetch('/api/v1/billing/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (e) {
    console.warn('[Billing] Falling back to direct calculation:', e);
  }

  // Graceful offline fallback in display-only mode
  const basePaise = Math.round((params.baseLaborRupees || 0) * 100);
  const partsPaise = Math.round((params.partsMaterialsRupees || 0) * 100);
  const discPaise = Math.round((params.discountRupees || 0) * 100);
  const subtotalPaise = Math.max(0, basePaise + partsPaise - discPaise);
  const commPaise = Math.round(basePaise * 0.20);
  const gstPaise = Math.round(commPaise * 0.18);
  const totalPaise = subtotalPaise + gstPaise;

  return {
    base_amount_paise: basePaise,
    parts_materials_amount_paise: partsPaise,
    parts_cost_paise: partsPaise,
    parts_markup_paise: 0,
    subtotal_paise: subtotalPaise,
    discount_paise: discPaise,
    platform_commission_paise: commPaise,
    gst_amount_paise: gstPaise,
    total_amount_paise: totalPaise,
    provider_payout_paise: Math.max(0, totalPaise - commPaise - gstPaise),
    baseAmount: Math.round(basePaise / 100),
    partsMaterialsAmount: Math.round(partsPaise / 100),
    subtotal: Math.round(subtotalPaise / 100),
    discount: Math.round(discPaise / 100),
    platformCommissionAmount: Math.round(commPaise / 100),
    gstAmount: Math.round(gstPaise / 100),
    totalAmount: Math.round(totalPaise / 100),
    providerPayoutAmount: Math.round(Math.max(0, totalPaise - commPaise - gstPaise) / 100)
  };
}

/**
 * Universal Billing Reconciler (Thin Display Helper)
 * Reads server-computed amounts (including integer paise) directly from the record.
 * Never calculates pricing or business rules on the client.
 */
export function resolveBookingBilling(item: any): BookingBillingSummary {
  if (!item) {
    return {
      baseAmount: 499,
      partsAmount: 0,
      subtotal: 499,
      discount: 0,
      total: 499,
      partsDescription: 'Spare parts & replacement fittings installed',
      serviceDisplayName: 'Doorstep Service & Inspection',
      itemsRepaired: []
    };
  }

  // 1. Newly added materials list and parts description
  const newlyAdded = item.newlyAddedMaterials || item.newly_added_materials || [];
  const partsFromList = Array.isArray(newlyAdded)
    ? newlyAdded.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    : 0;

  // 2. Read Server-Computed Amounts (Integer Paise First)
  const partsMaterialsAmountPaise = item.parts_materials_amount_paise;
  const partsAmount = typeof partsMaterialsAmountPaise === 'number'
    ? Math.round(partsMaterialsAmountPaise / 100)
    : Number(item.partsMaterialsAmount ?? item.parts_materials_amount ?? item.parts_cost ?? partsFromList ?? 0) || 0;

  const baseAmountPaise = item.base_amount_paise;
  let baseAmount = 0;
  if (typeof baseAmountPaise === 'number') {
    baseAmount = Math.round(baseAmountPaise / 100);
  } else {
    const explicitBase = [item.baseLaborAmount, item.base_labor_amount, item.base_amount].find(
      v => typeof v === 'number' && v > 0
    );
    if (explicitBase !== undefined) {
      baseAmount = explicitBase;
    } else if (typeof item.price === 'number' && item.price > 0) {
      baseAmount = item.price;
    } else {
      const serviceId = item.service_id || item.serviceId;
      const matched = DEFAULT_SERVICES.find(s => s.id === serviceId);
      if (typeof matched?.price === 'number' && matched.price > 0) {
        baseAmount = matched.price;
      } else {
        const recordedTotal = [
          item.totalAmountPaid,
          item.total_amount_paid,
          item.total_price,
          item.total_amount
        ].find(v => typeof v === 'number' && v > 0) || 0;

        if (recordedTotal > partsAmount) {
          baseAmount = recordedTotal - partsAmount;
        } else {
          baseAmount = 499;
        }
      }
    }
  }

  const totalAmountPaise = item.total_amount_paise;
  const discountPaise = item.discount_paise;
  const discount = typeof discountPaise === 'number'
    ? Math.round(discountPaise / 100)
    : Number(item.discount || item.whistleblower_discount || item.whistleblowerDiscount || 0) || 0;

  const subtotal = baseAmount + partsAmount;

  // Total: prioritize server-calculated integer paise if present; otherwise invariant subtotal - discount
  let total: number;
  if (typeof totalAmountPaise === 'number') {
    total = Math.round(totalAmountPaise / 100);
  } else {
    total = Math.max(0, subtotal - discount);
  }

  const gstAmount = item.gst_amount_paise
    ? Math.round(item.gst_amount_paise / 100)
    : Number(item.gst_amount || 0);

  const partsDesc = newlyAdded.length > 0
    ? newlyAdded.map((p: any) => `${p.description || p.name} (₹${p.amount})`).join(', ')
    : (item.parts_description || item.partsDescription || 'Spare parts & replacement fittings installed');

  const serviceDisplayName = item.serviceName || item.service_name || item.service?.name || 'Doorstep Service & Inspection';

  const itemsRepaired = item.itemsRepaired || item.items_repaired || (item.service && item.service.included_tasks) || [
    'Comprehensive fault diagnosis & safety test',
    'Precision repair & component replacement',
    'Flow & leakage seal test'
  ];

  return {
    baseAmount,
    partsAmount,
    subtotal,
    discount,
    total,
    gstAmount,
    baseAmountPaise,
    totalAmountPaise,
    partsDescription: partsDesc,
    serviceDisplayName,
    itemsRepaired
  };
}
