const paths: Record<string, string> = {
  Sales: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  CRM: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 11v2",
  Purchase: "M4 6h16l-2 9H7L4 3H2 M9 20h.01 M17 20h.01",
  Inventory: "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10 M8 5l9 4",
  Accounting: "M4 20h16 M6 16v-5 M12 16V5 M18 16V8",
  Invoicing: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3",
  "Point of Sale": "M4 4h16v12H4z M8 20h8 M12 16v4 M8 8h3 M8 11h7",
  home: "M3 11l9-8 9 8 M5 9v12h5v-7h4v7h5V9",
  returns: "M8 5L3 10l5 5 M3 10h11a6 6 0 0 1 0 12",
};

export function AppIcon({ name, className = "" }: { name: string; className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.home} /></svg>;
}

export const appDescriptions: Record<string, { label: string; description: string; tone: string }> = {
  Sales: { label: "Penjualan", description: "Pesanan pelanggan dan pengiriman barang.", tone: "plum" },
  CRM: { label: "Peluang pelanggan", description: "Peluang pesanan dan tindak lanjut pelanggan.", tone: "rose" },
  Purchase: { label: "Pembelian", description: "Pesanan pemasok dan penerimaan barang.", tone: "blue" },
  Inventory: { label: "Produk & stok", description: "Stok tersedia dan perpindahan antar lokasi.", tone: "green" },
  Accounting: { label: "Akuntansi", description: "Jurnal transaksi dan saldo keuangan.", tone: "amber" },
  Invoicing: { label: "Tagihan & pembayaran", description: "Tagihan pelanggan, pemasok, dan pelunasannya.", tone: "teal" },
  "Point of Sale": { label: "Kasir", description: "Penjualan di kedai, pembayaran, dan struk.", tone: "coffee" },
};
