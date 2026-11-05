export type DemoProduct = {
  sku: string;
  name: string;
  size: string;
  price: number;
  cost: number;
  vendorId: string;
  wh: number;
  cafe: number;
  reserved: number;
};

export type DemoOrder = {
  number: string;
  customerId: string;
  sku: string;
  quantity: number;
  delivered: number;
  invoiced: number;
  discount: number;
  status: string;
  reservationActive: boolean;
};

export type DemoInvoice = {
  number: string;
  customerId: string;
  source: string;
  sku?: string;
  quantity?: number;
  subtotal: number;
  tax: number;
  paid: number;
  credited?: number;
  returned?: number;
  opening?: boolean;
};

export type DemoPurchaseOrder = {
  number: string;
  vendorId: string;
  sku: string;
  quantity: number;
  received: number;
  billed: number;
  unitCost: number;
  status: string;
};

export type DemoBill = {
  number: string;
  vendorId: string;
  source: string;
  total: number;
  paid: number;
  opening?: boolean;
};

export type DemoJournal = {
  number: string;
  source: string;
  memo: string;
  debit: number;
  credit: number;
};

export type DemoState = {
  products: DemoProduct[];
  salesOrders: DemoOrder[];
  purchaseOrders: DemoPurchaseOrder[];
  invoices: DemoInvoice[];
  bills: DemoBill[];
  journals: DemoJournal[];
  leads: { number: string; customerId: string; sku: string; quantity: number; stage: string; expected: number; probability: number; lostReason?: string }[];
  returns: { number: string; source: string; sku: string; quantity: number; condition: string; total: number }[];
  receipts: { number: string; total: number; method: string; sku: string; quantity: number }[];
  transfers: { number: string; sku: string; quantity: number }[];
  cash: number;
  bank: number;
  drawer: number;
  events: string[];
  nextSales: number;
  nextPurchase: number;
  nextInvoice: number;
  nextBill: number;
  nextJournal: number;
  nextLead: number;
  nextReturn: number;
  nextReceipt: number;
  nextTransfer: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDemoProduct(value: unknown): value is DemoProduct {
  return isRecord(value) &&
    typeof value.sku === "string" &&
    typeof value.name === "string" &&
    typeof value.size === "string" &&
    isFiniteNumber(value.price) &&
    isFiniteNumber(value.cost) &&
    typeof value.vendorId === "string" &&
    isFiniteNumber(value.wh) &&
    isFiniteNumber(value.cafe) &&
    isFiniteNumber(value.reserved);
}

function isDemoOrder(value: unknown): value is DemoState["salesOrders"][number] {
  return isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.customerId === "string" &&
    typeof value.sku === "string" &&
    isFiniteNumber(value.quantity) &&
    isFiniteNumber(value.delivered) &&
    isFiniteNumber(value.invoiced) &&
    isFiniteNumber(value.discount) &&
    typeof value.status === "string" &&
    typeof value.reservationActive === "boolean";
}

function isDemoInvoice(value: unknown): value is DemoInvoice {
  return isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.customerId === "string" &&
    typeof value.source === "string" &&
    (value.sku === undefined || typeof value.sku === "string") &&
    (value.quantity === undefined || isFiniteNumber(value.quantity)) &&
    isFiniteNumber(value.subtotal) &&
    isFiniteNumber(value.tax) &&
    isFiniteNumber(value.paid) &&
    (value.credited === undefined || isFiniteNumber(value.credited)) &&
    (value.returned === undefined || isFiniteNumber(value.returned));
}

function isDemoPurchaseOrder(value: unknown): value is DemoPurchaseOrder {
  return isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.vendorId === "string" &&
    typeof value.sku === "string" &&
    isFiniteNumber(value.quantity) &&
    isFiniteNumber(value.received) &&
    isFiniteNumber(value.billed) &&
    isFiniteNumber(value.unitCost) &&
    typeof value.status === "string";
}

function isDemoBill(value: unknown): value is DemoBill {
  return isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.vendorId === "string" &&
    typeof value.source === "string" &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.paid);
}

function isDemoJournal(value: unknown): value is DemoJournal {
  return isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.source === "string" &&
    typeof value.memo === "string" &&
    isFiniteNumber(value.debit) &&
    isFiniteNumber(value.credit);
}

export function isDemoState(value: unknown): value is DemoState {
  if (!isRecord(value)) return false;
  const arrays: [keyof DemoState, (item: unknown) => boolean][] = [
    ["products", isDemoProduct],
    ["salesOrders", isDemoOrder],
    ["purchaseOrders", isDemoPurchaseOrder],
    ["invoices", isDemoInvoice],
    ["bills", isDemoBill],
    ["journals", isDemoJournal],
    ["leads", (item) => isRecord(item) && typeof item.number === "string" && typeof item.customerId === "string" && typeof item.sku === "string" && isFiniteNumber(item.quantity) && typeof item.stage === "string" && isFiniteNumber(item.expected) && isFiniteNumber(item.probability)],
    ["returns", (item) => isRecord(item) && typeof item.number === "string" && typeof item.source === "string" && typeof item.sku === "string" && isFiniteNumber(item.quantity) && typeof item.condition === "string" && isFiniteNumber(item.total)],
    ["receipts", (item) => isRecord(item) && typeof item.number === "string" && isFiniteNumber(item.total) && typeof item.method === "string" && typeof item.sku === "string" && isFiniteNumber(item.quantity)],
    ["transfers", (item) => isRecord(item) && typeof item.number === "string" && typeof item.sku === "string" && isFiniteNumber(item.quantity)],
    ["events", (item) => typeof item === "string"],
  ];
  if (!arrays.every(([key, isItem]) => Array.isArray(value[key]) && value[key].every(isItem))) {
    return false;
  }
  const numbers: (keyof DemoState)[] = [
    "cash", "bank", "drawer", "nextSales", "nextPurchase", "nextInvoice",
    "nextBill", "nextJournal", "nextLead", "nextReturn", "nextReceipt", "nextTransfer",
  ];
  return numbers.every((key) => isFiniteNumber(value[key]));
}

export const demoCustomers = [
  { id: "C01", name: "PT Sinar Karsa", limit: 1_000_000 },
  { id: "C02", name: "CV Bina Citra", limit: 300_000 },
  { id: "C03", name: "Koperasi Tunas Mentari", limit: 1_000_000 },
  { id: "C04", name: "Klinik Harapan Ibu", limit: 750_000 },
  { id: "C05", name: "Yayasan Cendekia Kota", limit: 500_000 },
  { id: "C06", name: "Pelanggan Tunai", limit: 0 },
];

export const demoVendors = [
  { id: "V01", name: "Kedai Seduh Mitra" },
  { id: "V02", name: "Kedai Kopi Pagi" },
  { id: "V03", name: "Kedai Pastri Rumi" },
  { id: "V04", name: "Kedai Teh Embun" },
];

const products: DemoProduct[] = [
  { sku: "CBW-250", name: "Cold brew botolan", size: "250 ml", price: 30000, cost: 15000, vendorId: "V01", wh: 40, cafe: 20, reserved: 10 },
  { sku: "KSU-250", name: "Kopi susu aren botolan", size: "250 ml", price: 25000, cost: 13000, vendorId: "V02", wh: 20, cafe: 10, reserved: 0 },
  { sku: "KLT-250", name: "Kopi latte botolan", size: "250 ml", price: 24000, cost: 12000, vendorId: "V02", wh: 20, cafe: 10, reserved: 0 },
  { sku: "KAP-250", name: "Kapucino botolan", size: "250 ml", price: 22000, cost: 11000, vendorId: "V02", wh: 20, cafe: 10, reserved: 0 },
  { sku: "KFV-250", name: "Kopi vanila botolan", size: "250 ml", price: 28000, cost: 16000, vendorId: "V01", wh: 20, cafe: 10, reserved: 0 },
  { sku: "KMC-250", name: "Mokacino botolan", size: "250 ml", price: 32000, cost: 18000, vendorId: "V01", wh: 20, cafe: 10, reserved: 0 },
  { sku: "CKB-PCS", name: "Brownies mini", size: "1 buah", price: 8000, cost: 4000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "KUK-PCS", name: "Kukis mentega", size: "1 buah", price: 5000, cost: 2000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "CRO-PCS", name: "Croissant mini", size: "1 buah", price: 7000, cost: 3000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "MUF-PCS", name: "Muffin mini", size: "1 buah", price: 5000, cost: 2000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "GRN-PCS", name: "Granola bite", size: "1 buah", price: 4000, cost: 1000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "AIR-250", name: "Air mineral siap saji", size: "250 ml", price: 7000, cost: 3000, vendorId: "V03", wh: 20, cafe: 10, reserved: 0 },
  { sku: "CBW-500", name: "Cold brew botolan", size: "500 ml", price: 40000, cost: 22000, vendorId: "V01", wh: 20, cafe: 10, reserved: 0 },
  { sku: "TEH-250", name: "Teh manis botolan", size: "250 ml", price: 6000, cost: 2000, vendorId: "V04", wh: 20, cafe: 10, reserved: 0 },
  { sku: "LEM-250", name: "Teh lemon botolan", size: "250 ml", price: 10000, cost: 4000, vendorId: "V04", wh: 20, cafe: 10, reserved: 0 },
];

export function createInitialDemoState(): DemoState {
  return {
    products: products.map((product) => ({ ...product })),
    salesOrders: [{
      number: "S00001",
      customerId: "C01",
      sku: "CBW-250",
      quantity: 10,
      delivered: 0,
      invoiced: 0,
      discount: 0,
      status: "Sales Order",
      reservationActive: true,
    }],
    purchaseOrders: [{
      number: "PO00001",
      vendorId: "V01",
      sku: "CBW-250",
      quantity: 20,
      received: 0,
      billed: 0,
      unitCost: 15000,
      status: "Purchase Order",
    }],
    invoices: [{ number: "OPEN-AR-C02", customerId: "C02", source: "Saldo awal", subtotal: 220000, tax: 0, paid: 0, opening: true }],
    bills: [{ number: "OPEN-AP-V02", vendorId: "V02", source: "Saldo awal", total: 300000, paid: 0, opening: true }],
    journals: [{ number: "JRN/OPEN/20261020", source: "Saldo pembuka", memo: "Jurnal pembukaan dataset tugas", debit: 15010000, credit: 15010000 }],
    leads: [{ number: "L00001", customerId: "C03", sku: "CBW-250", quantity: 10, stage: "New", expected: 300000, probability: 40 }],
    returns: [],
    receipts: [],
    transfers: [],
    cash: 500000,
    bank: 10000000,
    drawer: 100000,
    events: ["Baseline 20 Okt 2026 · stok pembuka 480 unit · transaksi historis tidak diposting ulang"],
    nextSales: 2,
    nextPurchase: 2,
    nextInvoice: 1,
    nextBill: 1,
    nextJournal: 1,
    nextLead: 2,
    nextReturn: 1,
    nextReceipt: 1,
    nextTransfer: 1,
  };
}
