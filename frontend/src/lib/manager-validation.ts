export function nonBlank(value: string): boolean {
  return value.trim().length > 0;
}

export function positiveInteger(value: string): number | null {
  if (!nonBlank(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function nonNegativeNumber(value: string): number | null {
  if (!nonBlank(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function boundedInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!nonBlank(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return null;
  return parsed;
}

export function dateIsBefore(left: string, right: string): boolean {
  if (!nonBlank(left) || !nonBlank(right)) return false;
  return left < right;
}

export function dateIsPast(value: string, today = new Date()): boolean {
  if (!nonBlank(value)) return false;
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const candidate = new Date(`${value}T00:00:00`);
  return candidate.getTime() < localToday.getTime();
}

export function validateBatchForm(input: {
  code: string;
  medicineId: string;
  supplierId: string;
  quantity: string;
  receivedDate: string;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
}): string | null {
  if (!nonBlank(input.code)) return "Hãy nhập mã lô.";
  if (positiveInteger(input.medicineId) === null) return "Hãy chọn thuốc.";
  if (positiveInteger(input.supplierId) === null) return "Hãy chọn nhà cung cấp.";
  if (positiveInteger(input.quantity) === null) return "Số lượng nhập phải là số nguyên lớn hơn 0.";
  if (!nonBlank(input.receivedDate)) return "Hãy chọn ngày nhập.";
  if (!nonBlank(input.expiryDate)) return "Hãy chọn hạn sử dụng.";
  if (dateIsBefore(input.expiryDate, input.receivedDate)) {
    return "Hạn sử dụng không được trước ngày nhập.";
  }
  if (nonNegativeNumber(input.purchasePrice) === null) {
    return "Giá nhập phải là số từ 0 trở lên.";
  }
  if (nonNegativeNumber(input.sellingPrice) === null) {
    return "Giá bán phải là số từ 0 trở lên.";
  }
  return null;
}

export function validateInvoiceForm(input: {
  code: string;
  batchId: string;
  quantity: string;
  remaining?: number;
  expiryDate?: string;
}): string | null {
  if (!nonBlank(input.code)) return "Hãy nhập mã hóa đơn.";
  if (positiveInteger(input.batchId) === null) return "Hãy chọn lô thuốc còn hạn và còn tồn.";
  const quantity = positiveInteger(input.quantity);
  if (quantity === null) return "Số lượng bán phải là số nguyên lớn hơn 0.";
  if (input.expiryDate && dateIsPast(input.expiryDate)) {
    return "Không thể bán thuốc thuộc lô đã hết hạn.";
  }
  if (input.remaining !== undefined && quantity > input.remaining) {
    return `Số lượng bán vượt tồn của lô. Hiện còn ${input.remaining}.`;
  }
  return null;
}
