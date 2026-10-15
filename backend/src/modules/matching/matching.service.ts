import { db, ProviderRecord, UserRecord } from '../../db/database.js';

export interface MatchedProvider {
  provider: ProviderRecord;
  user: UserRecord;
  distanceKm: number;
  score: number;
}

export class MatchingService {
  // Haversine formula to compute great-circle distance between two GPS coordinates
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Find and rank eligible service providers across active regional hubs (Sagara, Hosanagara, Honnali) based on current live location proximity
   */
  public static findEligibleProviders(
    categoryId: string,
    customerLat: number,
    customerLng: number,
    maxRadiusKm: number = 20
  ): MatchedProvider[] {
    const matched: MatchedProvider[] = [];

    for (const provider of db.providers) {
      // 1. Must match trade category
      if (!provider.trade_categories.includes(categoryId)) {
        continue;
      }

      // 2. Must be KYC verified
      if (provider.kyc_status !== 'verified') {
        continue;
      }

      // 3. Must be online and available
      if (!provider.is_available || !provider.is_online) {
        continue;
      }

      // 4. Distance check
      const distance = this.calculateDistanceKm(
        customerLat,
        customerLng,
        provider.current_lat,
        provider.current_lng
      );

      const effectiveRadius = Math.min(provider.service_radius_km || 15, maxRadiusKm);
      if (distance > effectiveRadius) {
        continue;
      }

      const user = db.users.find((u) => u.id === provider.user_id);
      if (!user) continue;

      // Ranking score calculation:
      // High rating is rewarded, closer distance is prioritized
      // Score = (Rating * 20) - (Distance * 2)
      const score = provider.rating * 20 - distance * 2;

      matched.push({
        provider,
        user,
        distanceKm: distance,
        score
      });
    }

    // Sort descending by score (best match first)
    matched.sort((a, b) => b.score - a.score);
    return matched;
  }

  /**
   * Server-Side Dispatch Engine:
   * Filters available job requests by technician duty status (is_online), KYC, trade category, and geographic radius.
   */
  public static getAvailableJobsForTechnician(params: {
    providerId?: string;
    providerUserId?: string;
    lat?: number;
    lng?: number;
    tradeCategory?: string;
    radiusKm?: number;
  }) {
    const provider = db.providers.find(
      (p) => p.id === params.providerId || p.user_id === params.providerUserId || p.user_id === params.providerId
    );

    if (!provider) {
      throw new Error('Technician profile not found');
    }

    // 1. Strict Duty Status Check: Technician must be ONLINE
    if (!provider.is_online) {
      throw new Error('TECHNICIAN_OFFLINE: Duty status is offline. Please turn duty ON to receive job dispatch offers.');
    }

    // 2. KYC Verification Check
    if (provider.kyc_status !== 'verified') {
      throw new Error('KYC_UNVERIFIED: Technician KYC verification is pending or rejected.');
    }

    // 3. Single-Job Policy: If technician has an active job, return empty pool
    const activeOngoing = db.bookings.find(
      (b) =>
        b.provider_id === provider.user_id &&
        ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_IN_PROGRESS'].includes(b.status)
    );
    if (activeOngoing) {
      return [];
    }

    const techLat = params.lat ?? provider.current_lat;
    const techLng = params.lng ?? provider.current_lng;
    const maxRadius = params.radiusKm || provider.service_radius_km || 25;

    // 4. Filter bookings in open dispatch state (REQUESTED, PROVIDER_MATCHED)
    const availablePool = db.bookings.filter((b) => {
      const isPendingStatus = b.status === 'REQUESTED' || b.status === 'PROVIDER_MATCHED';
      if (!isPendingStatus) return false;

      // Unassigned or assigned to this provider
      if (b.provider_id && b.provider_id !== provider.user_id) return false;

      // Category matching
      const service = db.services.find((s) => s.id === b.service_id);
      const categoryId = service?.category_id || b.service_id;
      const matchesCategory =
        provider.trade_categories.includes(categoryId) ||
        (params.tradeCategory && provider.trade_categories.includes(params.tradeCategory));
      if (!matchesCategory) return false;

      // Geofence / radius proximity check
      const bLat = b.address_lat || 14.1670;
      const bLng = b.address_lng || 75.0298;
      const distance = this.calculateDistanceKm(techLat, techLng, bLat, bLng);
      return distance <= maxRadius;
    });

    // 5. Sort by distance ascending (closest first)
    return availablePool.sort((a, b) => {
      const distA = this.calculateDistanceKm(techLat, techLng, a.address_lat || 14.1670, a.address_lng || 75.0298);
      const distB = this.calculateDistanceKm(techLat, techLng, b.address_lat || 14.1670, b.address_lng || 75.0298);
      return distA - distB;
    });
  }
}

