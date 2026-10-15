import { describe, it, expect } from "vitest";
import { compareFaceWithKycPhoto, compressImageForUpload, detectFaceInPhoto } from "./lib/aiFaceMatch";

describe("AI Face Match Enabler", () => {
  it("should return verified match when KYC photo is missing / avatar preset", async () => {
    const liveSelfie = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const result = await compareFaceWithKycPhoto(liveSelfie, undefined);

    expect(result).toBeDefined();
    expect(result.matched).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(result.status).toBe("VERIFIED_MATCH");
    expect(result.badgeText).toContain("AI Biometrics Verified");
    expect(result.metrics.facialGeometryMatch).toBeGreaterThan(0);
  });

  it("should compare live selfie with photo URL and produce valid score and metrics", async () => {
    const liveSelfie = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const kycPhoto = "https://images.unsplash.com/photo-1540569014015-19a7be504e3a";
    const result = await compareFaceWithKycPhoto(liveSelfie, kycPhoto);

    expect(result).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThanOrEqual(48);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
    expect(["VERIFIED_MATCH", "PROBABLE_MATCH", "MISMATCH_FLAGGED"]).toContain(result.status);
    expect(result.metrics.eyeJawlineAlignment).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
  });

  it("should detect face presence in photo with confidence score and message", async () => {
    const liveSelfie = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const detection = await detectFaceInPhoto(liveSelfie);
    expect(detection).toBeDefined();
    expect(typeof detection.faceDetected).toBe("boolean");
    expect(typeof detection.confidenceScore).toBe("number");
    expect(typeof detection.message).toBe("string");
  });

  it("should compress non-empty data URLs gracefully", async () => {
    const rawImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const compressed = await compressImageForUpload(rawImage, 100, 100, 0.7);
    expect(compressed).toBeDefined();
    expect(typeof compressed).toBe("string");
  });

  it("should handle plain text or URLs in compressImageForUpload without throwing", async () => {
    const url = "https://images.unsplash.com/photo-1540569014015-19a7be504e3a";
    const result = await compressImageForUpload(url);
    expect(result).toBe(url);
  });
});
