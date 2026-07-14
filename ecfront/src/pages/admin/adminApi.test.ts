import { describe, it, expect } from "vitest";
import { mapUser, getStoreName, type KcUser } from "./adminApi";

describe("mapUser", () => {
  it("derives an active customer", () => {
    const u = mapUser({ id: "1", username: "alice", email: "a@x.io", enabled: true });
    expect(u).toMatchObject({ role: "User", status: "active", email: "a@x.io" });
  });

  it("classifies superadmin as Admin", () => {
    const u = mapUser({ id: "2", username: "superadmin", enabled: true });
    expect(u.role).toBe("Admin");
  });

  it("classifies a user with a store as Seller", () => {
    const u = mapUser({ id: "3", username: "bob", enabled: true, attributes: { storeName: ["Bob's"] } });
    expect(u.role).toBe("Seller");
  });

  it("marks a disabled pending user as pending", () => {
    const u = mapUser({ id: "4", username: "c", enabled: false, attributes: { status: ["pending"] } });
    expect(u.status).toBe("pending");
  });

  it("marks a disabled non-pending user as suspended", () => {
    const u = mapUser({ id: "5", username: "d", enabled: false });
    expect(u.status).toBe("suspended");
  });

  it("builds the display name from first/last name, falling back to username", () => {
    expect(mapUser({ id: "6", firstName: "Jane", lastName: "Doe", enabled: true }).name).toBe("Jane Doe");
    expect(mapUser({ id: "7", username: "just_user", enabled: true }).name).toBe("just_user");
  });

  it("formats joined date as YYYY-MM-DD", () => {
    const ts = Date.UTC(2025, 0, 15);
    expect(mapUser({ id: "8", username: "e", enabled: true, createdTimestamp: ts }).joined).toBe("2025-01-15");
  });
});

describe("getStoreName", () => {
  it("returns the store name attribute when present", () => {
    const u: KcUser = { id: "1", attributes: { storeName: ["My Shop"] } };
    expect(getStoreName(u)).toBe("My Shop");
  });
  it("returns empty string when absent or null", () => {
    expect(getStoreName({ id: "2" })).toBe("");
    expect(getStoreName(null)).toBe("");
  });
});
