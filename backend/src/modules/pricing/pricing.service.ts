import { config } from '../../config.js';
import { BillingService, BillingCalculationResult } from '../billing/billing.service.js';

export interface PriceBreakdown extends BillingCalculationResult {}

export class PricingService {
  public static calculatePricing(
    baseServicePrice: number,
    partsMaterialsAmount: number = 0,
    partsMarkupRate: number = 0,
    discountAmount: number = 0
  ): PriceBreakdown {
    return BillingService.calculateBilling({
      baseLaborRupees: baseServicePrice,
      partsMaterialsRupees: partsMaterialsAmount,
      partsMarkupRate,
      discountRupees: discountAmount
    });
  }
}
