import { parseUiLocale } from "../src/i18n/uiLocale";

describe("parseUiLocale", () => {
  it("returns locale for valid codes", () => {
    expect(parseUiLocale("es")).toBe("es");
    expect(parseUiLocale("en")).toBe("en");
    expect(parseUiLocale("ro")).toBe("ro");
  });

  it("returns null for invalid or empty values", () => {
    expect(parseUiLocale("fr")).toBeNull();
    expect(parseUiLocale("")).toBeNull();
    expect(parseUiLocale(null)).toBeNull();
    expect(parseUiLocale(undefined)).toBeNull();
  });
});
