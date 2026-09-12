import { describe, expect, it } from "vitest";

import {
  boundedInteger,
  validateBatchForm,
  validateInvoiceForm,
} from "./manager-validation";

describe("manager validation", () => {
  it("rejects incomplete batch input", () => {
    expect(
      validateBatchForm({
        code: "",
        medicineId: "",
        supplierId: "",
        quantity: "",
        receivedDate: "",
        expiryDate: "",
        purchasePrice: "",
        sellingPrice: "",
      }),
    ).toBe("Hãy nhập mã lô.");
  });

  it("rejects expiry before received date", () => {
    expect(
      validateBatchForm({
        code: "LO-01",
        medicineId: "1",
        supplierId: "1",
        quantity: "10",
        receivedDate: "2026-09-12",
        expiryDate: "2026-09-11",
        purchasePrice: "10000",
        sellingPrice: "12000",
      }),
    ).toBe("Hạn sử dụng không được trước ngày nhập.");
  });

  it("rejects invoice quantity above stock", () => {
    expect(
      validateInvoiceForm({
        code: "HD-01",
        batchId: "1",
        quantity: "11",
        remaining: 10,
        expiryDate: "2099-01-01",
      }),
    ).toContain("vượt tồn");
  });

  it("validates bounded integer filters", () => {
    expect(boundedInteger("", 0, 3650)).toBeNull();
    expect(boundedInteger("-1", 0, 3650)).toBeNull();
    expect(boundedInteger("90", 0, 3650)).toBe(90);
  });
});
