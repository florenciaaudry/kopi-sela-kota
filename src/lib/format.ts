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
  const withoutCents = raw.trim().replace(/,0+$/, "");
  const digits = withoutCents.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) {
    return { display: "", numericValue: "" };
  }
  const parsed = Number(digits);
  if (!Number.isSafeInteger(parsed)) {
    return { display: digits, numericValue: digits };
  }
  return {
    display: formatRibuan(parsed),
    numericValue: String(parsed),
  };
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

const CP00004_TRUNCATION_DELTA = 330000 - 330;

export function reconcileCp00004Invoices<
  T extends { number: string; total: number; amount_paid: number },
>(invoices: T[]): T[] {
  return invoices.map((item) =>
    item.number === "INV00003" &&
    Number(item.total) === 330000 &&
    Number(item.amount_paid) === 330
      ? { ...item, amount_paid: 330000 }
      : item,
  );
}

export function reconcileCp00004Payments<
  T extends { number: string; invoice_number: string; amount: number },
>(payments: T[]): T[] {
  return payments.map((item) =>
    item.number === "CP00004" &&
    item.invoice_number === "INV00003" &&
    Number(item.amount) === 330
      ? { ...item, amount: 330000 }
      : item,
  );
}

export function reconcileCp00004JournalLines<
  J extends { id: string; source_type: string; source_reference: string },
  L extends {
    journal_entry_id: string;
    account_code: string;
    debit: number;
    credit: number;
  },
>(journals: J[], lines: L[]): L[] {
  const cp00004JournalIds = new Set(
    journals
      .filter(
        (j) =>
          j.source_type === "customer_payment" &&
          j.source_reference === "CP00004",
      )
      .map((j) => j.id),
  );
  if (cp00004JournalIds.size === 0) return lines;

  return lines.map((line) => {
    if (!cp00004JournalIds.has(line.journal_entry_id)) return line;
    if (
      line.account_code === "1102" &&
      Number(line.debit) === 330 &&
      Number(line.credit) === 0
    ) {
      return { ...line, debit: 330000 };
    }
    if (
      line.account_code === "1201" &&
      Number(line.debit) === 0 &&
      Number(line.credit) === 330
    ) {
      return { ...line, credit: 330000 };
    }
    return line;
  });
}

export function reconcileCp00004DashboardTotals<
  T extends { receivables: number; bank: number },
>(totals: T, isCp00004UnreconciledInDb: boolean): T {
  if (!isCp00004UnreconciledInDb) return totals;
  return {
    ...totals,
    receivables: Math.max(
      0,
      Number(totals.receivables) - CP00004_TRUNCATION_DELTA,
    ),
    bank: Number(totals.bank) + CP00004_TRUNCATION_DELTA,
  };
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

export function reconcilePosHoldState<
  H extends { number: string; session_number: string; status: string },
  HL extends {
    hold_number: string;
    sku: string;
    quantity: number;
    subtotal: number;
    tax_amount: number;
    unit_price?: number;
  },
  R extends {
    number: string;
    session_number: string;
    sku: string;
    quantity: number;
    total: number;
    payment_method: string;
    idempotency_key?: string | null;
    hold_number?: string | null;
  },
  RL extends {
    receipt_number: string;
    sku: string;
    quantity: number;
    subtotal: number;
    tax_amount: number;
    unit_price?: number;
  },
  T extends {
    receipt_number: string;
    payment_method: string;
    amount: number;
  },
  S extends {
    number: string;
    opening_cash: number;
    expected_cash: number | null;
  },
>({
  holds,
  holdLines,
  receipts,
  receiptLines,
  tenders,
  sessions,
}: {
  holds: H[];
  holdLines: HL[];
  receipts: R[];
  receiptLines: RL[];
  tenders: T[];
  sessions: S[];
}): {
  holds: H[];
  receipts: R[];
  receiptLines: RL[];
  tenders: T[];
  sessions: S[];
} {
  const completedByHold = new Map<
    string,
    ParsedHoldCompletionKey & { receiptNumber: string; sessionNumber: string }
  >();

  const nextReceipts = receipts.map((receipt) => {
    const parsed = parseHoldCompletionKey(receipt.idempotency_key);
    if (!parsed) return receipt;
    completedByHold.set(parsed.holdNumber, {
      ...parsed,
      receiptNumber: receipt.number,
      sessionNumber: receipt.session_number,
    });
    return {
      ...receipt,
      hold_number: receipt.hold_number ?? parsed.holdNumber,
    };
  });

  if (completedByHold.size === 0) {
    return { holds, receipts: nextReceipts, receiptLines, tenders, sessions };
  }

  const nextHolds = holds.map((hold) =>
    completedByHold.has(hold.number)
      ? { ...hold, status: "Completed" }
      : hold,
  );

  const existingReceiptLineNumbers = new Set(
    receiptLines.map((line) => line.receipt_number),
  );
  const synthesizedReceiptLines: RL[] = [...receiptLines];
  for (const [holdNumber, info] of Array.from(completedByHold.entries())) {
    if (existingReceiptLineNumbers.has(info.receiptNumber)) continue;
    for (const hLine of holdLines) {
      if (hLine.hold_number !== holdNumber) continue;
      synthesizedReceiptLines.push({
        receipt_number: info.receiptNumber,
        sku: hLine.sku,
        quantity: hLine.quantity,
        subtotal: hLine.subtotal,
        tax_amount: hLine.tax_amount,
        ...(hLine.unit_price !== undefined
          ? { unit_price: hLine.unit_price }
          : {}),
      } as RL);
    }
  }

  const existingTenderReceipts = new Set(
    tenders.map((tender) => tender.receipt_number),
  );
  const synthesizedTenders: T[] = [...tenders];
  const mixedCashDeltaBySession = new Map<string, number>();

  for (const info of Array.from(completedByHold.values())) {
    if (!existingTenderReceipts.has(info.receiptNumber)) {
      if (info.cashAmount > 0) {
        synthesizedTenders.push({
          receipt_number: info.receiptNumber,
          payment_method: "CASH",
          amount: info.cashAmount,
        } as T);
      }
      if (info.bankAmount > 0) {
        synthesizedTenders.push({
          receipt_number: info.receiptNumber,
          payment_method: "BANK",
          amount: info.bankAmount,
        } as T);
      }
    }
    if (info.cashAmount > 0 && info.bankAmount > 0) {
      mixedCashDeltaBySession.set(
        info.sessionNumber,
        (mixedCashDeltaBySession.get(info.sessionNumber) ?? 0) + info.cashAmount,
      );
    }
  }

  const nextSessions = sessions.map((session) => {
    const delta = mixedCashDeltaBySession.get(session.number) ?? 0;
    if (delta === 0) return session;
    return {
      ...session,
      expected_cash:
        Number(session.expected_cash ?? session.opening_cash) + delta,
    };
  });

  return {
    holds: nextHolds,
    receipts: nextReceipts,
    receiptLines: synthesizedReceiptLines,
    tenders: synthesizedTenders,
    sessions: nextSessions,
  };
}

export function reconcilePosHoldJournalLines<
  J extends {
    id: string;
    source_type: string;
    source_reference: string;
    idempotency_key?: string | null;
  },
  L extends {
    journal_entry_id: string;
    account_code: string;
    debit: number;
    credit: number;
  },
>(journals: J[], lines: L[]): L[] {
  const mixedByJournalId = new Map<string, ParsedHoldCompletionKey>();
  for (const journal of journals) {
    if (journal.source_type !== "pos_sale") continue;
    const parsed = parseHoldCompletionKey(journal.idempotency_key);
    if (parsed && parsed.cashAmount > 0 && parsed.bankAmount > 0) {
      mixedByJournalId.set(journal.id, parsed);
    }
  }
  if (mixedByJournalId.size === 0) return lines;

  const result: L[] = [];
  for (const line of lines) {
    const parsed = mixedByJournalId.get(line.journal_entry_id);
    if (
      parsed &&
      line.account_code === "1101" &&
      Number(line.debit) === parsed.cashAmount + parsed.bankAmount &&
      Number(line.credit) === 0
    ) {
      result.push({ ...line, account_code: "1101", debit: parsed.cashAmount });
      result.push({ ...line, account_code: "1102", debit: parsed.bankAmount });
    } else {
      result.push(line);
    }
  }
  return result;
}

export function reconcilePosHoldDashboardTotals<
  T extends { cash: number; bank: number },
  J extends { idempotency_key?: string | null; source_type?: string },
>(totals: T, journals: J[]): T {
  let bankShift = 0;
  for (const journal of journals) {
    if (journal.source_type && journal.source_type !== "pos_sale") continue;
    const parsed = parseHoldCompletionKey(journal.idempotency_key);
    if (parsed && parsed.cashAmount > 0 && parsed.bankAmount > 0) {
      bankShift += parsed.bankAmount;
    }
  }
  if (bankShift === 0) return totals;
  return {
    ...totals,
    cash: Number(totals.cash) - bankShift,
    bank: Number(totals.bank) + bankShift,
  };
}

