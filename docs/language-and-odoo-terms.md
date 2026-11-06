# Bahasa skenario dan istilah Odoo

Mengikuti ketentuan PDF: **bahasa skenario Indonesia; istilah Odoo dalam bahasa Inggris**.

Nama aplikasi, dokumen, field, status dan aksi ERP ditulis dalam Inggris. Deskripsi kegunaan, petunjuk, alasan penolakan dan penjelasan operasional tetap Indonesia. Nama produk, nama perusahaan, Rupiah dan PBJT mengikuti dataset.

| Area | Istilah pada tampilan | Penjelasan Indonesia |
|---|---|---|
| Aplikasi | Sales, CRM, Purchase, Inventory, Accounting, Invoicing, Point of Sale | Tujuh aplikasi, tetap dalam empat kelompok fungsional PDF |
| Menu lintas modul | Returns & Credit Notes, Reporting | Retur dan laporan, bukan aplikasi tambahan |
| Sales | Sales Order, New Sales Order, Confirm Sales Order, Delivery, Validate Delivery | Pesanan dan pengiriman pelanggan |
| Purchase | Purchase Order, New Purchase Order, Goods Receipt, Validate Receipt | Pesanan pemasok dan penerimaan barang |
| Invoicing | Customer Invoices, Vendor Bills, Create Invoice, Post Invoice, Register Payment | Tagihan dan pembayaran |
| Accounting | Journal Entries, Journal Items, Accounts Receivable, Accounts Payable, Cash, Bank | Catatan keuangan dan saldo |
| Inventory | On Hand, Reserved, Available, Internal Transfer, Source Location, Destination Location | Stok fisik, reservasi, ketersediaan dan lokasi |
| CRM | Lead, Opportunities, Pipeline, Kanban, Stage, New, Qualified, Proposition, Won, Lost | Peluang dan tahap tindak lanjut |
| Point of Sale | POS Sessions, Open Session, Opening Cash, Hold Order, Validate Payment, Receipt, Close Session | Sesi, pesanan, pembayaran, struk dan penutupan |
| Field | Customer, Vendor, Product, Quantity, Unit Price, Discount, Amount, Due Date | Field tetap bisa dijelaskan melalui petunjuk Indonesia |
| Navigasi data | Apps, Search, Filters, Group By | Pencarian dan pengelompokan data |

Pemetaan tampilan terpusat pada `src/lib/erp-terminology.ts`. Label internal yang menjadi kunci klasifikasi aksi tetap dipertahankan agar penerjemahan tidak mengubah hak role atau pemanggilan transaksi. Nama field FormData, nomor dokumen, status database dan nominal tidak diubah.

Nama aplikasi Inggris hanya ditampilkan sekali di kartu/sidebar; deskripsi Indonesia menjelaskan kegunaannya. Tidak menambahkan label Quotation atau persetujuan yang belum diimplementasikan.

Verifikasi perubahan: typecheck, lint, production build dan test:role-policy lulus; tes akses aktual 114 PASS/0 FAIL. Ekspektasi judul test:roles memakai daftar nama modul kanonis yang sama. Browser Owner menunjukkan kartu aplikasi Inggris, breadcrumb Sales dan form New Sales Order dengan Customer, Product, Quantity, Discount serta Confirm Sales Order. Form ditutup tanpa posting transaksi. Pemeriksaan ini bukan pengujian seluruh alur bisnis PDF.
