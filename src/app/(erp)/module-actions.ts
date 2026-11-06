"use server";

import { parseCartLines } from "@/lib/pos-cart";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { AppRole, Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ModulePath =
  | "/sales"
  | "/crm"
  | "/purchase"
  | "/inventory"
  | "/accounting"
  | "/invoicing"
  | "/pos"
  | "/returns";

type RpcResponse = {
  data: string | null;
  error: { message: string } | null;
};

function showMessage(path: ModulePath, name: "error" | "success", message: string): never {
  redirect(`${path}?${name}=${encodeURIComponent(message)}`);
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function required(form: FormData, name: string, label: string, path: ModulePath): string {
  const value = text(form, name);
  if (!value) showMessage(path, "error", `${label} wajib diisi.`);
  return value;
}

function positiveInteger(form: FormData, name: string, label: string, path: ModulePath): number {
  const value = Number(text(form, name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    showMessage(path, "error", `${label} harus bilangan bulat lebih besar dari nol.`);
  }
  return value;
}

function nonNegativeInteger(form: FormData, name: string, label: string, path: ModulePath): number {
  const raw = text(form, name);
  const value = Number(raw);
  if (!raw || !Number.isSafeInteger(value) || value < 0) {
    showMessage(path, "error", `${label} harus bilangan bulat nol atau lebih.`);
  }
  return value;
}

function amount(form: FormData, name: string, label: string, path: ModulePath): number {
  const value = Number(text(form, name));
  if (!Number.isFinite(value) || value <= 0) {
    showMessage(path, "error", `${label} harus lebih besar dari nol.`);
  }
  return value;
}

async function submitRpc(
  path: ModulePath,
  roles: AppRole[],
  invoke: (client: Awaited<ReturnType<typeof createSupabaseServerClient>>) => PromiseLike<RpcResponse>,
) {
  await requireRole(roles);
  const client = await createSupabaseServerClient();
  const { data, error } = await invoke(client);
  if (error) showMessage(path, "error", error.message);
  if (!data) showMessage(path, "error", "Database tidak mengembalikan nomor dokumen.");
  revalidatePath(path);
  revalidatePath("/");
  showMessage(path, "success", `Transaksi tersimpan: ${data}`);
}

function idempotencyKey(form: FormData, path: ModulePath): string {
  return required(form, "idempotency_key", "Kunci transaksi", path);
}

export async function createSalesOrderAction(form: FormData) {
  const path = "/sales";
  const customerId = required(form, "customer_id", "Pelanggan", path);
  const sku = required(form, "sku", "SKU", path);
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const discount = Number(text(form, "discount_percent") || "0");
  if (!Number.isFinite(discount) || discount < 0 || discount > 5) {
    showMessage(path, "error", "Diskon harus antara 0% dan 5%.");
  }
  const sourceLead = text(form, "source_lead_number");
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["sales", "owner"], (client) =>
    client.rpc("create_sales_order", {
      p_customer_id: customerId,
      p_sku: sku,
      p_quantity: quantity,
      p_discount_percent: discount,
      p_idempotency_key: key,
      p_source_lead_number: sourceLead || undefined,
    }),
  );
}

export async function deliverSalesOrderAction(form: FormData) {
  const path = "/sales";
  const salesOrder = required(form, "sales_order_number", "Sales Order", path);
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["warehouse", "owner"], (client) =>
    client.rpc("deliver_sales_order", {
      p_sales_order_number: salesOrder,
      p_quantity: quantity,
      p_idempotency_key: key,
    }),
  );
}

export async function createLeadAction(form: FormData) {
  const path = "/crm";
  const customerId = required(form, "customer_id", "Pelanggan", path);
  const sku = required(form, "sku", "SKU", path);
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const probability = Number(text(form, "probability"));
  if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
    showMessage(path, "error", "Probabilitas harus antara 0% dan 100%.");
  }
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["sales", "owner"], (client) =>
    client.rpc("create_lead", {
      p_customer_id: customerId,
      p_sku: sku,
      p_quantity: quantity,
      p_probability: probability,
      p_idempotency_key: key,
    }),
  );
}

export async function updateLeadStageAction(form: FormData) {
  const path = "/crm";
  const lead = required(form, "lead_number", "Lead", path);
  const stage = required(form, "stage", "Tahap", path);
  const reason = text(form, "lost_reason");
  if (stage === "Lost" && !reason) {
    showMessage(path, "error", "Alasan wajib diisi untuk tahap Lost.");
  }
  return submitRpc(path, ["sales", "owner"], (client) =>
    client.rpc("update_lead_stage", {
      p_lead_number: lead,
      p_stage: stage,
      p_lost_reason: reason || undefined,
    }),
  );
}

export async function createPurchaseOrderAction(form: FormData) {
  const path = "/purchase";
  const vendorId = required(form, "vendor_id", "Pemasok", path);
  const sku = required(form, "sku", "SKU", path);
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["procurement", "owner"], (client) =>
    client.rpc("create_purchase_order", {
      p_vendor_id: vendorId,
      p_sku: sku,
      p_quantity: quantity,
      p_idempotency_key: key,
    }),
  );
}

export async function receivePurchaseOrderAction(form: FormData) {
  const path = "/purchase";
  const purchaseOrder = required(form, "purchase_order_number", "Purchase Order", path);
  const accepted = nonNegativeInteger(form, "accepted_quantity", "Kuantitas diterima", path);
  const rejected = nonNegativeInteger(form, "rejected_quantity", "Kuantitas ditolak", path);
  if (accepted + rejected === 0) {
    showMessage(path, "error", "Jumlah diterima dan ditolak tidak boleh sama-sama nol.");
  }
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["warehouse", "owner"], (client) =>
    client.rpc("receive_purchase_order", {
      p_purchase_order_number: purchaseOrder,
      p_accepted_quantity: accepted,
      p_rejected_quantity: rejected,
      p_idempotency_key: key,
    }),
  );
}

export async function transferInventoryAction(form: FormData) {
  const path = "/inventory";
  const sku = required(form, "sku", "SKU", path);
  const source = required(form, "source_location", "Lokasi sumber", path);
  const destination = required(form, "destination_location", "Lokasi tujuan", path);
  if (source === destination) showMessage(path, "error", "Lokasi sumber dan tujuan harus berbeda.");
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["warehouse", "owner"], (client) =>
    client.rpc("transfer_inventory", {
      p_sku: sku,
      p_source_location: source,
      p_destination_location: destination,
      p_quantity: quantity,
      p_idempotency_key: key,
    }),
  );
}

export async function createInvoiceAction(form: FormData) {
  const path = "/invoicing";
  const salesOrder = required(form, "sales_order_number", "Sales Order", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["finance", "owner"], (client) =>
    client.rpc("invoice_delivered_sales_order", {
      p_sales_order_number: salesOrder,
      p_idempotency_key: key,
    }),
  );
}

export async function recordCustomerPaymentAction(form: FormData) {
  const path = "/invoicing";
  const invoice = required(form, "invoice_number", "Invoice", path);
  const paymentAmount = amount(form, "amount", "Pembayaran", path);
  const accountCode = required(form, "account_code", "Akun penerimaan", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["finance", "owner"], (client) =>
    client.rpc("record_customer_payment", {
      p_invoice_number: invoice,
      p_amount: paymentAmount,
      p_account_code: accountCode,
      p_idempotency_key: key,
    }),
  );
}

export async function createVendorBillAction(form: FormData) {
  const path = "/invoicing";
  const purchaseOrder = required(form, "purchase_order_number", "Purchase Order", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["finance", "owner"], (client) =>
    client.rpc("create_vendor_bill", {
      p_purchase_order_number: purchaseOrder,
      p_idempotency_key: key,
    }),
  );
}

export async function recordVendorPaymentAction(form: FormData) {
  const path = "/invoicing";
  const bill = required(form, "bill_number", "Vendor Bill", path);
  const paymentAmount = amount(form, "amount", "Pembayaran", path);
  const accountCode = required(form, "account_code", "Akun pembayaran", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["finance", "owner"], (client) =>
    client.rpc("record_vendor_payment", {
      p_bill_number: bill,
      p_amount: paymentAmount,
      p_account_code: accountCode,
      p_idempotency_key: key,
    }),
  );
}

export async function openPosSessionAction(form: FormData) {
  const path = "/pos";
  const openingCash = Number(text(form, "opening_cash"));
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    showMessage(path, "error", "Kas awal tidak valid.");
  }
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("open_pos_session", {
      p_opening_cash: openingCash,
      p_idempotency_key: key,
    }),
  );
}

export async function createPosSaleAction(form: FormData) {
  const path = "/pos";
  const sku = required(form, "sku", "SKU", path);
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const paymentMethod = required(form, "payment_method", "Metode pembayaran", path);
  const customerId = text(form, "customer_id");
  const key = idempotencyKey(form, path);
  if (!customerId) {
    return submitRpc(path, ["cashier", "owner"], (client) =>
      client.rpc("create_pos_sale", {
        p_sku: sku,
        p_quantity: quantity,
        p_payment_method: paymentMethod,
        p_idempotency_key: key,
      }),
    );
  }
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("create_pos_sale_for_customer", {
      p_sku: sku,
      p_quantity: quantity,
      p_payment_method: paymentMethod,
      p_idempotency_key: key,
      p_customer_id: customerId || null,
    }),
  );
}

export async function createPosHoldAction(form: FormData) {
  const path = "/pos";
  let lines;
  try {
    lines = parseCartLines(form.getAll("cart_sku"), form.getAll("cart_quantity"));
  } catch (error) {
    showMessage(path, "error", error instanceof Error ? error.message : "Keranjang tidak valid.");
  }
  const key = idempotencyKey(form, path);
  const jsonLines: Json = lines.map((line) => ({ sku: line.sku, quantity: line.quantity }));
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("create_pos_hold", {
      p_lines: jsonLines,
      p_expires_in_minutes: 10,
      p_idempotency_key: key,
    }),
  );
}

export async function cancelPosHoldAction(form: FormData) {
  const path = "/pos";
  const hold = required(form, "hold_number", "Hold", path);
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("cancel_pos_hold", { p_hold_number: hold }),
  );
}

export async function expirePosHoldsAction() {
  const path = "/pos";
  await requireRole(["cashier", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("expire_pos_holds");
  if (error) showMessage(path, "error", error.message);
  if (data === null) showMessage(path, "error", "Database tidak mengembalikan jumlah hold expired.");
  revalidatePath(path);
  showMessage(path, "success", `${data} hold kedaluwarsa dilepas dari reservasi.`);
}

export async function completePosHoldAction(form: FormData) {
  const path = "/pos";
  const hold = required(form, "hold_number", "Hold", path);
  const cash = Number(text(form, "cash_amount") || "0");
  const bank = Number(text(form, "bank_amount") || "0");
  if (!Number.isFinite(cash) || !Number.isFinite(bank) || cash < 0 || bank < 0 || cash + bank <= 0) {
    showMessage(path, "error", "Tender Cash/Bank harus bernilai nol atau lebih, dan totalnya harus lebih dari nol.");
  }
  const tenders: { payment_method: string; amount: number }[] = [];
  if (cash > 0) tenders.push({ payment_method: "CASH", amount: cash });
  if (bank > 0) tenders.push({ payment_method: "BANK", amount: bank });
  const jsonTenders: Json = tenders.map((tender) => ({
    payment_method: tender.payment_method,
    amount: tender.amount,
  }));
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("complete_pos_hold", {
      p_hold_number: hold,
      p_tenders: jsonTenders,
      p_idempotency_key: key,
    }),
  );
}

export async function closePosSessionAction(form: FormData) {
  const path = "/pos";
  const session = required(form, "session_number", "Sesi", path);
  const counted = Number(text(form, "counted_cash"));
  if (!Number.isFinite(counted) || counted < 0) {
    showMessage(path, "error", "Kas terhitung tidak valid.");
  }
  return submitRpc(path, ["cashier", "owner"], (client) =>
    client.rpc("close_pos_session", {
      p_session_number: session,
      p_counted_cash: counted,
      p_variance_reason: text(form, "variance_reason") || undefined,
    }),
  );
}

export async function createCreditNoteAction(form: FormData) {
  const path = "/returns";
  const invoiceSku = required(form, "invoice_sku", "Invoice dan SKU", path);
  const [invoice, sku] = invoiceSku.split("|");
  if (!invoice || !sku) showMessage(path, "error", "Kombinasi invoice dan SKU tidak valid.");
  const quantity = positiveInteger(form, "quantity", "Kuantitas", path);
  const condition = required(form, "item_condition", "Kondisi barang", path);
  const key = idempotencyKey(form, path);
  return submitRpc(path, ["finance", "owner"], (client) =>
    client.rpc("create_customer_credit_note", {
      p_invoice_number: invoice,
      p_sku: sku,
      p_quantity: quantity,
      p_item_condition: condition,
      p_idempotency_key: key,
    }),
  );
}

export async function approvePosVarianceAction(form: FormData) {
  const path = "/pos";
  const session = required(form, "session_number", "Sesi", path);
  return submitRpc(path, ["owner"], (client) =>
    client.rpc("approve_pos_session_variance", { p_session_number: session }),
  );
}
