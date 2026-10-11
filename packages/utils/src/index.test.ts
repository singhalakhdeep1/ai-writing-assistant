import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { debounce, hostnameMatches } from "./index.js";

describe("@awa/utils debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces function calls (Module 14)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("@awa/utils hostnameMatches", () => {
  it("matches exact hostnames", () => {
    expect(hostnameMatches("mail.google.com", "mail.google.com")).toBe(true);
  });

  it("matches wildcard subdomains", () => {
    expect(hostnameMatches("app.example.com", "*.example.com")).toBe(true);
  });

  it("does not match unrelated hosts", () => {
    expect(hostnameMatches("evil.com", "google.com")).toBe(false);
  });
});
