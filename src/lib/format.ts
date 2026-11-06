const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const thousandFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}

export function formatRibuan(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return thousandFormatter.format(Math.trunc(amount));
}

export function normalizeCurrencyText(raw: string): {
  display: string;
  numericValue: string;
} {
  if (!raw.trim()) return { display: "", numericValue: "" };
  try {
    const parsed = parseRupiahInput(raw, { allowZero: true });
    return { display: formatRibuan(parsed), numericValue: String(parsed) };
  } catch {
    // Preserve invalid input so neither client nor server silently changes its value.
    return { display: raw, numericValue: raw };
  }
}

export function parseRupiahInput(
  raw: unknown,
  options?: { allowZero?: boolean; label?: string },
): number {
  const allowZero = options?.allowZero ?? false;
  const label = options?.label ?? "Jumlah pembayaran";

  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw) || (allowZero ? raw < 0 : raw <= 0)) {
      throw new Error(
        allowZero
          ? `${label} harus berupa nominal Rupiah bulat nol atau lebih.`
          : `${label} harus berupa nominal Rupiah bulat lebih besar dari nol.`,
      );
    }
    return raw;
  }

  if (typeof raw !== "string") {
    throw new Error(`${label} wajib diisi.`);
  }

  const cleaned = raw
    .trim()
    .replace(/^(rp|idr)\s*/i, "")
    .replace(/[\s\u00a0]/g, "");

  if (!cleaned) {
    throw new Error(`${label} wajib diisi.`);
  }

  if (cleaned.startsWith("-")) {
    throw new Error(`${label} tidak boleh bernilai negatif.`);
  }

  let digits: string;
  if (/^\d{1,3}(\.\d{3})+(,0+)?$/.test(cleaned)) {
    // Format ribuan Indonesia: "330.000", "33.000", "1.500.000", "330.000,00"
    digits = cleaned.replace(/,0+$/, "").replace(/\./g, "");
  } else if (/^\d{1,3}(,\d{3})+(\.0+)?$/.test(cleaned)) {
    // Format ribuan internasional: "330,000", "1,500,000"
    digits = cleaned.replace(/\.0+$/, "").replace(/,/g, "");
  } else if (/^\d+(,0+)?$/.test(cleaned)) {
    // Angka utuh tanpa pemisah ribuan: "330000", "33000", "1500000", "330000,00"
    digits = cleaned.replace(/,0+$/, "");
  } else {
    throw new Error(
      `${label} tidak valid. Masukkan nominal Rupiah utuh (contoh: 330.000 atau 330000).`,
    );
  }

  const value = Number(digits);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} melampaui batas nominal yang didukung.`);
  }

  if (allowZero ? value < 0 : value <= 0) {
    throw new Error(
      allowZero
        ? `${label} harus bernilai nol atau lebih.`
        : `${label} harus lebih besar dari nol.`,
    );
  }

  return value;
}

export interface ParsedHoldCompletionKey {
  holdNumber: string;
  cashAmount: number;
  bankAmount: number;
  requestKey: string;
}

const HOLD_COMPLETION_KEY_REGEX =
  /^(?:pos-sale:)?hold-complete:(HOLD\/\d+):(\d+):(\d+):(.+)$/;

export function parseHoldCompletionKey(
  idempotencyKey: string | null | undefined,
): ParsedHoldCompletionKey | null {
  if (!idempotencyKey) return null;
  const match = HOLD_COMPLETION_KEY_REGEX.exec(idempotencyKey.trim());
  if (!match) return null;
  const cashAmount = Number(match[2]);
  const bankAmount = Number(match[3]);
  if (!Number.isSafeInteger(cashAmount) || !Number.isSafeInteger(bankAmount)) {
    return null;
  }
  return {
    holdNumber: match[1],
    cashAmount,
    bankAmount,
    requestKey: match[4],
  };
}

export function validatePosHoldTenders(
  cash: number,
  bank: number,
  expectedTotal: number,
): {
  tenders: { payment_method: "CASH" | "BANK"; amount: number }[];
  paymentMethod: "CASH" | "BANK" | "MIXED";
  totalTender: number;
} {
  if (
    !Number.isSafeInteger(cash) ||
    !Number.isSafeInteger(bank) ||
    cash < 0 ||
    bank < 0 ||
    cash + bank <= 0
  ) {
    throw new Error(
      "Tender Cash/Bank harus bernilai nol atau lebih, dan totalnya harus lebih dari nol.",
    );
  }
  const totalTender = cash + bank;
  if (totalTender !== expectedTotal) {
    throw new Error(
      `Total tender ${formatRupiah(totalTender)} harus sama dengan total struk ${formatRupiah(expectedTotal)}.`,
    );
  }
  const tenders: { payment_method: "CASH" | "BANK"; amount: number }[] = [];
  if (cash > 0) tenders.push({ payment_method: "CASH", amount: cash });
  if (bank > 0) tenders.push({ payment_method: "BANK", amount: bank });
  const paymentMethod: "CASH" | "BANK" | "MIXED" =
    cash > 0 && bank > 0 ? "MIXED" : cash > 0 ? "CASH" : "BANK";
  return { tenders, paymentMethod, totalTender };
}

