import { describe, it, expect, beforeEach } from "vitest";
import { api, BookingRecord, generateRoboMaskedPhone } from "../lib/api";

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

// Polyfill window event bus for Node test runner
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

describe("Technician Arrival Verification, Auto-Location Selfie & Masked Telephony", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. Masked Telephony (Robo Phone) & Privacy Protection", () => {
    it("generates an Urban Daily VoIP robo masked bridge number hiding the technician's real phone", () => {
      const bookingId = "bk_test_88412";
      const masked = generateRoboMaskedPhone(bookingId);

      expect(masked).toContain("+91 80 4719 3320");
      expect(masked).toMatch(/\(Ext: \d{4}\)/);

      // Deterministic extension PIN for the same booking
      const maskedAgain = generateRoboMaskedPhone(bookingId);
      expect(masked).toBe(maskedAgain);
    });

    it("attaches technician photo, assigns masked robo phone, and hides real phone on job acceptance", async () => {
      // Mock active technician in localStorage
      const techUser = {
        id: "usr_tech_sagara_1",
        name: "Manjunath Gowda",
        role: "provider",
        phone: "9845112233", // Real personal phone
        avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150",
        kyc_status: "approved"
      };
      localStorageMock.setItem("mud_active_user", JSON.stringify(techUser));

      // Seed booking in mud_firestore_bookings
      const seedBooking: BookingRecord = {
        id: "bk_plumb_001",
        customer_id: "usr_cust_001",
        service_id: "srv_pipe_repair",
        category_id: "cat-plumbing",
        technician_id: null,
        status: "PENDING",
        otp: "4821",
        doorstep_otp: "4821",
        address_text: "Gandhi Nagar 3rd Cross",
        address_lat: 14.1670,
        address_lng: 75.0400,
        address_locality: "Gandhi Nagar, Sagara",
        price: 450,
        created_at: new Date().toISOString()
      };
      localStorageMock.setItem("mud_firestore_bookings", JSON.stringify([seedBooking]));

      let acceptedEventDetail: any = null;
      const handleAccepted = (e: any) => { acceptedEventDetail = e.detail; };
      (globalThis as any).window.addEventListener("mud_booking_accepted", handleAccepted);

      // Accept booking
      await api.updateBookingStatus("bk_plumb_001", "ACCEPTED");
      (globalThis as any).window.removeEventListener("mud_booking_accepted", handleAccepted);

      const updated = await api.getBooking("bk_plumb_001");

      expect(updated).toBeDefined();
      expect(updated?.status).toBe("ACCEPTED");
      expect(updated?.technician_name).toBe("Manjunath Gowda");
      // Customer sees the Robo Telephony bridge number, not the real phone
      expect(updated?.technician_phone).toContain("+91 80 4719 3320");
      expect(updated?.technician_masked_phone).toBe(updated?.technician_phone);
      // Real phone is stored privately
      expect(updated?.technician_real_phone).toBe("9845112233");
      // Technician photo is attached
      expect(updated?.technician_avatar_url).toContain("images.unsplash.com");

      // Verify event was dispatched to customer
      expect(acceptedEventDetail).toBeDefined();
      expect(acceptedEventDetail?.technician_name).toBe("Manjunath Gowda");
      expect(acceptedEventDetail?.technician_phone).toContain("+91 80 4719 3320");
      expect(acceptedEventDetail?.technician_avatar_url).toBeDefined();
    });
  });

  describe("2. Doorstep Arrival Geolocation & OTP Verification", () => {
    it("records verified doorstep geolocation when technician reaches customer location", async () => {
      const seedBooking: BookingRecord = {
        id: "bk_geo_002",
        customer_id: "usr_cust_002",
        service_id: "srv_ac_repair",
        category_id: "cat-appliances",
        technician_id: "usr_tech_1",
        technician_name: "Ramesh Sharma",
        status: "EN_ROUTE",
        address_text: "Jog Road, Sagara",
        address_lat: 14.1685,
        address_lng: 75.0380,
        address_locality: "Jog Road, Sagara",
        price: 599,
        created_at: new Date().toISOString()
      };
      localStorageMock.setItem("mud_firestore_bookings", JSON.stringify([seedBooking]));

      const dutyCoords = { lat: 14.1684, lng: 75.0381 };
      const res = await api.verifyArrivalGeoLocation("bk_geo_002", dutyCoords, 18);

      expect(res.success).toBe(true);
      const bookings = await api.getBookings();
      const target = bookings.find(b => b.id === "bk_geo_002");
      expect(target?.arrival_geo_verified).toBe(true);
      expect(target?.arrival_geo_coords?.lat).toBeCloseTo(14.1684, 4);
      expect(target?.arrival_geo_distance_meters).toBe(18);
    });

    it("validates 4-digit doorstep OTP and transitions to ARRIVED without jumping prematurely to IN_PROGRESS", async () => {
      const seedBooking: BookingRecord = {
        id: "bk_otp_003",
        customer_id: "usr_cust_003",
        service_id: "srv_wiring",
        category_id: "cat-electrician",
        technician_id: "usr_tech_1",
        status: "EN_ROUTE",
        doorstep_otp: "5932",
        otp: "5932",
        address_text: "Subhash Nagar, Sagara",
        address_lat: 14.1650,
        address_lng: 75.0390,
        address_locality: "Subhash Nagar, Sagara",
        price: 350,
        created_at: new Date().toISOString()
      };
      localStorageMock.setItem("mud_firestore_bookings", JSON.stringify([seedBooking]));

      // Incorrect OTP rejection
      await expect(api.verifyDoorstepOtp("bk_otp_003", "0000")).rejects.toThrow("Incorrect OTP");

      // Correct OTP verification
      const verifyRes = await api.verifyDoorstepOtp("bk_otp_003", "5932", { autoStartJob: false });
      expect(verifyRes.verified).toBe(true);

      const bookings = await api.getBookings();
      const target = bookings.find(b => b.id === "bk_otp_003");
      expect(target?.status).toBe("ARRIVED");
      expect(target?.arrival_otp_verified).toBe(true);
      expect(target?.otp_verified_at).toBeDefined();
    });
  });

  describe("3. Stamped Live Selfie with Auto-Location & Start Job", () => {
    it("submits arrival selfie with auto-location watermark coordinates and locality stamp", async () => {
      const seedBooking: BookingRecord = {
        id: "bk_selfie_004",
        customer_id: "usr_cust_004",
        service_id: "srv_water_purifier",
        category_id: "cat-appliances",
        technician_id: "usr_tech_1",
        status: "ARRIVED",
        arrival_otp_verified: true,
        address_text: "Vinobha Nagar, Sagara",
        address_lat: 14.1660,
        address_lng: 75.0410,
        address_locality: "Vinobha Nagar, Sagara",
        price: 499,
        created_at: new Date().toISOString()
      };
      localStorageMock.setItem("mud_firestore_bookings", JSON.stringify([seedBooking]));

      const selfiePayload = {
        selfie_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAg...",
        coords: { lat: 14.1661, lng: 75.0412 },
        locality: "Vinobha Nagar, Sagara, Karnataka",
        timestamp: "29-Sep-2026, 05:00:00 PM IST"
      };

      const res = await api.submitArrivalSelfie("bk_selfie_004", selfiePayload);
      expect(res.success).toBe(true);

      const bookings = await api.getBookings();
      const target = bookings.find(b => b.id === "bk_selfie_004");
      expect(target?.arrival_selfie_verified).toBe(true);
      expect(target?.arrival_selfie_locality).toBe("Vinobha Nagar, Sagara, Karnataka");
      expect(target?.arrival_selfie_timestamp).toBe("29-Sep-2026, 05:00:00 PM IST");
      expect(target?.arrival_selfie_coords?.lat).toBe(14.1661);
    });

    it("starts the job only after arrival verification, transitioning status to IN_PROGRESS", async () => {
      const seedBooking: BookingRecord = {
        id: "bk_start_005",
        customer_id: "usr_cust_005",
        service_id: "srv_carpenter",
        category_id: "cat-carpenter",
        technician_id: "usr_tech_1",
        status: "ARRIVED",
        arrival_geo_verified: true,
        arrival_otp_verified: true,
        arrival_selfie_verified: true,
        arrival_selfie_url: "data:image/jpeg;base64,sample...",
        address_text: "Marikamba Temple Road, Sagara",
        address_lat: 14.1655,
        address_lng: 75.0395,
        address_locality: "Marikamba Temple Road, Sagara",
        price: 400,
        created_at: new Date().toISOString()
      };
      localStorageMock.setItem("mud_firestore_bookings", JSON.stringify([seedBooking]));

      const startRes = await api.startJobAfterVerification("bk_start_005");
      expect(startRes.success).toBe(true);

      const bookings = await api.getBookings();
      const target = bookings.find(b => b.id === "bk_start_005");
      expect(target?.status).toBe("IN_PROGRESS");
      expect(target?.job_started_at).toBeDefined();
    });
  });

  describe("4. Customer Contact Phone Inline Retention (No Profile Redirect)", () => {
    it("persists customer phone on booking creation and does not lose it across orders", async () => {
      // 1. Initial user without phone (e.g. fresh Google SSO login)
      const userWithoutPhone = {
        id: "usr_cust_google_99",
        name: "Sagara Resident",
        email: "resident@sagara.in",
        phone: null,
        role: "customer"
      };
      localStorageMock.setItem("mud_active_user", JSON.stringify(userWithoutPhone));

      // 2. User books with inline phone entered on checkout page
      const bookingRes = await api.createBooking({
        service_id: "srv_plumber_general",
        address_text: "Gandhi Nagar 2nd Main",
        address_lat: 14.1670,
        address_lng: 75.0400,
        address_locality: "Gandhi Nagar, Sagara",
        customer_phone: "9845123456"
      });

      expect(bookingRes).toBeDefined();
      expect(localStorageMock.getItem("mud_customer_phone")).toBe("9845123456");
      expect(localStorageMock.getItem("mud_remembered_phone")).toBe("9845123456");

      // 3. User session is automatically updated with phone
      const activeUser = JSON.parse(localStorageMock.getItem("mud_active_user") || "{}");
      expect(activeUser.phone).toBe("9845123456");

      // 4. getMe() preserves the phone number so subsequent orders never ask again
      const { user: refreshedUser } = await api.getMe();
      expect(refreshedUser.phone).toBe("9845123456");
    });
  });
});
