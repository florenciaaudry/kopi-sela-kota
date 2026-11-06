// Bahasa skenario Indonesia; nama aplikasi, dokumen, field dan status Odoo Inggris.
// Pemetaan ini hanya untuk presentasi, bukan nilai database atau identitas aksi.
export const moduleTitles: Record<string, string> = {
  sales: "Sales", crm: "CRM", purchase: "Purchase", inventory: "Inventory",
  accounting: "Accounting", invoicing: "Invoicing", pos: "Point of Sale",
  returns: "Returns & Credit Notes",
};

const labels: Record<string, string> = {
  "Penjualan": "Sales", "Pembelian": "Purchase", "Akuntansi": "Accounting",
  "Produk & Stok": "Inventory", "Produk & stok": "Inventory", "Kasir": "Cashier",
  "Pelanggan": "Customer", "Pelanggan (opsional)": "Customer (opsional)",
  "Piutang": "Accounts Receivable", "Utang": "Accounts Payable",
  "Pemasok": "Vendor", "Produk": "Product", "Produk pemasok": "Vendor Product",
  "Kuantitas": "Quantity", "Kuantitas retur": "Return Quantity", "Kuantitas terkirim": "Done Quantity",
  "Tahap": "Stage", "Probabilitas (%)": "Probability (%)",
  "Diskon (%) · maksimal 5%": "Discount (%) · maksimal 5%",
  "Lead sumber (opsional)": "Source Lead (opsional)", "Alasan Lost (wajib saat Lost)": "Lost Reason (wajib saat Lost)",
  "Jumlah pembayaran": "Amount", "Jumlah pembayaran (Rp)": "Amount (Rp)",
  "Akun penerimaan": "Payment Journal", "Akun pembayaran": "Payment Journal", "Kas": "Cash",
  "Metode pembayaran": "Payment Method", "Kondisi barang": "Inspection",
  "Diterima baik": "Accepted Quantity", "Ditolak": "Rejected Quantity",
  "Lokasi sumber": "Source Location", "Lokasi tujuan": "Destination Location",
  "Nomor": "Reference", "Tanggal": "Date", "Jatuh tempo": "Due Date", "Sumber": "Source Document",
  "Dibayar": "Paid", "Dikreditkan": "Credited", "Sisa": "Amount Due",
  "Neto": "Untaxed Amount", "Waktu": "Date & Time", "Dibuat": "Created At",
  "Terkirim": "Delivered", "Dipesan": "Ordered", "Lokasi": "Location",
  "Stok fisik · On Hand": "On Hand", "Nilai persediaan": "Inventory Value",
  "Tersedia": "Available", "Direservasi": "Reserved", "Satuan": "Unit of Measure",
  "Ukuran": "Variant", "Biaya standar": "Standard Cost", "Tujuan": "Destination Location",
  "Dokumen": "Document", "Jenis": "Type", "Akun": "Account",
  "Rincian debit/kredit": "Journal Items", "Probabilitas": "Probability", "Alasan Lost": "Lost Reason",
  "Diterima": "Receipt Date",
  "Jurnal terposting": "Journal Entries", "Piutang pelanggan": "Customer Invoices",
  "Utang pemasok": "Vendor Bills", "Riwayat pembayaran": "Payments", "Invoice terkait": "Related Invoices",
  "Pipeline peluang · Kanban": "Pipeline · Kanban", "Daftar peluang": "Opportunities",
  "Sesi POS": "POS Sessions", "Sesi": "Session", "Struk": "Receipts",
  "Hold dan baris pesanan": "Orders on Hold", "Kas awal": "Opening Cash",
  "Kas awal dari konfigurasi POS": "Opening Cash · sesuai konfigurasi POS",
  "Kas terhitung": "Counted Cash", "Alasan selisih kas": "Cash Difference Reason",
  "Harapan": "Expected Cash", "Hitung": "Counted Cash", "Selisih": "Difference",
  "Hold aktif": "Active Hold", "Kedaluwarsa": "Expires At", "Baris barang": "Order Lines",
  "Baris": "Order Lines", "Tender": "Payments", "Transfer antar lokasi": "Internal Transfer",
  "Stok per lokasi": "Stock by Location", "Riwayat transfer": "Internal Transfers",
  "Referensi pengiriman untuk pemeriksaan retur": "Delivery References · Return Inspection",
  "Produk terkirim": "Delivered Products",
  "Simpan Sales Order": "Confirm Sales Order", "Posting pengiriman": "Validate Delivery",
  "Simpan Lead": "Save Lead", "Simpan tahap": "Save Stage",
  "Simpan Purchase Order": "Confirm Purchase Order", "Posting penerimaan": "Validate Receipt",
  "Posting invoice": "Post Invoice", "Posting pembayaran": "Register Payment",
  "Posting Vendor Bill": "Post Vendor Bill", "Posting pembayaran vendor": "Register Payment",
  "Buka sesi": "Open Session", "Selesaikan penjualan": "Validate Payment",
  "Bayar dan buat satu struk": "Validate Payment",
  "Batalkan dan lepas reservasi": "Cancel Hold", "Periksa dan lepas hold expired": "Expire Holds",
  "Tutup sesi": "Close Session", "Setujui dan tutup": "Approve & Close",
  "Posting Credit Note": "Post Credit Note", "Simpan transfer": "Validate Transfer",
};

export function odooLabel(label: string | number): string {
  if (typeof label === "number") return String(label);
  if (label.startsWith("Tutup sesi ")) return label.replace("Tutup sesi ", "Close Session ");
  if (label.startsWith("Persetujuan selisih ")) return label.replace("Persetujuan selisih ", "Cash Difference Approval ");
  return labels[label] ?? label;
}
