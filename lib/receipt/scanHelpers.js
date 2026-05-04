import { defaultCategories } from "@/data/categories";

const INCOME_HINTS = [
  "salary",
  "payment received",
  "payment received:",
  "credited",
  "credit note",
  "refund received",
  "wage",
  "payroll",
  "bonus received",
];

export function inferReceiptTransactionType(parsed) {
  const blob = `${parsed?.description ?? ""} ${parsed?.merchantName ?? ""} ${parsed?.category ?? ""}`.toLowerCase();
  const incomeKeyword = INCOME_HINTS.some((k) => blob.includes(k));
  if (incomeKeyword) return "INCOME";

  const hint = parsed?.hintType?.toString().toUpperCase().trim();
  if (hint === "INCOME") return "INCOME";

  return "EXPENSE";
}

/**
 * Map AI category string to a valid defaultCategories id, or fallback.
 */
export function mapReceiptCategory(aiCategory, transactionType) {
  const fallback =
    transactionType === "INCOME" ? "other-income" : "other-expense";
  if (!aiCategory || !String(aiCategory).trim()) return fallback;

  const norm = String(aiCategory).toLowerCase().replace(/_/g, "-").trim();

  const exact = defaultCategories.find(
    (c) => c.id === norm && c.type === transactionType
  );
  if (exact) return exact.id;

  const byName = defaultCategories.find(
    (c) => c.name.toLowerCase() === norm.replace(/-/g, " ") && c.type === transactionType
  );
  if (byName) return byName.id;

  const partial = defaultCategories.find(
    (c) =>
      c.type === transactionType &&
      (norm.includes(c.id) || c.id.includes(norm))
  );
  if (partial) return partial.id;

  return fallback;
}
