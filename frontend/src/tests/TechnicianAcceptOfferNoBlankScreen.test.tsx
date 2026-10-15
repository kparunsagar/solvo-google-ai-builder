import { describe, it, expect, beforeEach } from "vitest";
import { api, getServiceName, getTradeCategoryForService, BookingRecord } from "../lib/api";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../lib/utils";

// Polyfill localStorage for Node test runner
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) || null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] || null
};
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = localStorageMock;
}

// Polyfill window event bus
const eventListeners: Record<string, Function[]> = {};
const windowMock = {
  addEventListener: (name: string, cb: Function) => {
    eventListeners[name] = eventListeners[name] || [];
    eventListeners[name].push(cb);
  },
  removeEventListener: (name: string, cb: Function) => {
    if (eventListeners[name]) {
      eventListeners[name] = eventListeners[name].filter(fn => fn !== cb);
    }
  },
  dispatchEvent: (event: any) => {
    const list = eventListeners[event.type] || [];
    list.forEach(fn => fn(event));
    return true;
  }
};
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = windowMock;
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, params: any = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

describe("Technician Offer Acceptance Blank Screen Prevention & Robust Rendering", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. getServiceName & getTradeCategoryForService Safe Guarding", () => {
    it("never throws when serviceId is undefined, null, or non-string", () => {
      expect(() => getServiceName(undefined)).not.toThrow();
      expect(getServiceName(undefined)).toBe("Home Service");

      expect(() => getServiceName(null)).not.toThrow();
      expect(getServiceName(null)).toBe("Home Service");

      expect(() => getServiceName("")).not.toThrow();
      expect(getServiceName("")).toBe("Home Service");

      expect(() => getServiceName(123 as any)).not.toThrow();
      expect(getServiceName(123 as any)).toBe("Home Service");
    });

    it("formats valid serviceIds properly without crashing", () => {
      expect(getServiceName("srv_plumber_general")).toContain("Plumber");
      expect(getServiceName("srv_electrician_general")).toContain("Electrician");
      expect(getServiceName("srv_ac_repair")).toContain("AC Servicing");
      expect(getServiceName("srv_custom_door_fix")).toBe("Custom Door Fix");
    });

    it("getTradeCategoryForService never throws on undefined, null, or malformed values", () => {
      expect(() => getTradeCategoryForService(undefined)).not.toThrow();
      expect(getTradeCategoryForService(undefined)).toBe("General Home Services");

      expect(() => getTradeCategoryForService(null)).not.toThrow();
      expect(getTradeCategoryForService(null)).toBe("General Home Services");

      expect(() => getTradeCategoryForService("")).not.toThrow();
      expect(getTradeCategoryForService("")).toBe("General Home Services");

      expect(getTradeCategoryForService("srv_leak_tap")).toBe("Plumbing & Sanitary");
      expect(getTradeCategoryForService("srv_fan_motor")).toBe("Automobile & Motor Care");
    });
  });

  describe("2. utils.ts Defensive Formatting Functions", () => {
    it("formatCurrency never throws on undefined, null, or NaN", () => {
      expect(() => formatCurrency(undefined)).not.toThrow();
      expect(formatCurrency(undefined)).toContain("0");

      expect(() => formatCurrency(null)).not.toThrow();
      expect(formatCurrency(null)).toContain("0");

      expect(() => formatCurrency(NaN)).not.toThrow();
      expect(formatCurrency(NaN)).toContain("0");

      expect(formatCurrency(499)).toContain("499");
    });

    it("formatDate never throws on undefined, null, or invalid dates", () => {
      expect(() => formatDate(undefined)).not.toThrow();
      expect(formatDate(undefined)).toBe("Recently");

      expect(() => formatDate(null)).not.toThrow();
      expect(formatDate(null)).toBe("Recently");

      expect(() => formatDate("invalid-date-string")).not.toThrow();
      expect(formatDate("invalid-date-string")).toBe("Recently");
    });

    it("getStatusColor and getStatusLabel handle undefined/null safely", () => {
      expect(() => getStatusColor(undefined)).not.toThrow();
      expect(getStatusColor(undefined)).toBe("bg-gray-100 text-gray-600 border-gray-200");

      expect(() => getStatusLabel(undefined)).not.toThrow();
      expect(getStatusLabel(undefined)).toBe("Assigned");

      expect(getStatusColor("ACCEPTED")).toContain("bg-blue-100");
      expect(getStatusLabel("ACCEPTED")).toBe("Technician Assigned");
    });
  });

  describe("3. Offer Acceptance & Active Job Enrichment Flow", () => {
    it("updates booking status and stores complete booking in local cache when accepted", async () => {
      const activeTech = {
        id: "usr_tech_manju",
        name: "Manjunath K",
        phone: "+919845011223",
        role: "provider",
        kyc_status: "approved"
      };
      localStorageMock.setItem("mud_active_user", JSON.stringify(activeTech));

      // Booking offer received via dispatch pool with partial fields
      const partialOffer: Partial<BookingRecord> = {
        id: "bk_flash_12345",
        status: "PENDING",
        address_locality: "Sagara, Karnataka",
        address_text: "Near KSRTC Bus Stand",
        price: 399
      };

      // Call updateBookingStatus
      const result = await api.updateBookingStatus(partialOffer.id!, "ACCEPTED");
      expect(result).toBeDefined();

      // Ensure local storage has the booking persisted
      const storedBookings = JSON.parse(localStorageMock.getItem("mud_firestore_bookings") || "[]");
      const found = storedBookings.find((b: any) => b.id === partialOffer.id);
      expect(found).toBeDefined();
      expect(found.status).toBe("ACCEPTED");
      expect(found.technician_id).toBe("usr_tech_manju");

      // Verify that getBookings returns the newly accepted job for technician role
      const myJobs = await api.getBookings();
      const currentActive = myJobs.find(j => j.id === partialOffer.id);
      expect(currentActive).toBeDefined();
      expect(currentActive?.technician_id).toBe("usr_tech_manju");
      expect(currentActive?.status).toBe("ACCEPTED");
    });

    it("enriches activeJob with fallback service_id and coordinates to prevent render crash", () => {
      const targetOffer: any = {
        id: "bk_no_service_id_999",
        status: "PENDING"
        // Intentionally missing service_id, address_locality, etc.
      };

      const user = {
        id: "usr_tech_manju",
        name: "Manjunath K",
        phone: "+919845011223"
      };

      // Simulating handleAcceptJob enrichedActiveJob creation
      const enrichedActiveJob: BookingRecord = {
        ...targetOffer,
        status: "ACCEPTED",
        technician_id: user.id,
        technician_name: user.name,
        technician_phone: user.phone,
        service_id: targetOffer.service_id || targetOffer.serviceId || "srv_plumber_general",
        address_locality: targetOffer.address_locality || "Sagara, Karnataka",
        address_text: targetOffer.address_text || "",
        price: targetOffer.price || targetOffer.base_amount || 350
      };

      // Verify activeJob has all fields required by Active Job card without throwing
      expect(enrichedActiveJob.service_id).toBe("srv_plumber_general");
      expect(() => getServiceName(enrichedActiveJob.service_id)).not.toThrow();
      expect(getServiceName(enrichedActiveJob.service_id)).toContain("Plumber");
      expect(getStatusColor(enrichedActiveJob.status)).toContain("bg-blue-100");
      expect(formatCurrency(enrichedActiveJob.price)).toContain("350");
    });
  });
});
