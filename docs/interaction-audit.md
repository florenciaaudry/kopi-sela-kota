# Audit interaksi dokumen — 7 November 2026

## Perbaikan konkret

Daftar lama sebagian besar berupa teks, sehingga nomor seperti S00008 tidak membuka apa pun. Referensi sekarang berupa tautan bergaris bawah. Data informatif seperti tanggal, total dan badge status tidak diubah menjadi tombol palsu. Dokumen terposting tidak menawarkan edit harga atau posting ulang.

| Area | Yang dapat dibuka | Aksi yang benar-benar tersedia pada detail |
|---|---|---|
| Sales | Sales Order, Customer, Product, Delivery; Opportunity sumber | Warehouse/Owner: Validate Delivery bila masih ada sisa. Owner: Create Invoice untuk Delivered yang belum ditagih. |
| CRM | Opportunity dari List dan Kanban, Customer, Product; Sales Order terkait | Sales/Owner: Update Stage; Lost wajib alasan. |
| Purchase | Purchase Order, Vendor, Product, Goods Receipt; Vendor Bills sesuai akses | Warehouse/Owner: Validate Receipt. Owner: Create Vendor Bill hanya Accepted belum ditagih. |
| Inventory | Product/SKU, stock per lokasi, Internal Transfer | Form Internal Transfer tetap di Inventory dengan validasi stok/sumber/tujuan yang sudah ada. |
| Invoicing | Customer Invoice, Vendor Bill, Customer/Vendor Payment, Credit Note | Finance/Owner: Register Payment bila Amount Due positif; penolakan overpayment tetap dari server/database. |
| Accounting / Reporting | Journal Entry beserta debit/kredit, source document yang diizinkan, KPI -> sumber laporan | Sumber jurnal tidak dapat diubah melalui detail baca-saja. Cashier tetap ditolak. |
| POS | Session, Hold, Receipt dan Customer | Sesi/hold milik sendiri: checkout tender penuh, Cancel Hold, Close Session sesuai status. Owner: approval Pending Approval. |
| Returns | Invoice asal, Credit Note, Delivery untuk Warehouse | Posting Credit Note tetap Finance/Owner. Workflow inspeksi terpisah belum tersedia. |
| Audit | Document Reference menuju tipe dokumen yang tercatat | History baca-saja; actor/waktu lama tidak ditulis ulang. |

Smart buttons pada Sales/Purchase/Lead/Session/Hold menelusuri dokumen terkait dan memperlihatkan jumlah record. Anchor memakai indeks bagian yang benar. Referensi dengan garis miring (JRN/...; POS/...; HOLD/...) ditangani dengan URL-safe representation tanpa mengganti nomor database. Idempotency key internal tidak ditampilkan sebagai nomor dokumen.

Kartu Customer menunjukkan Payment Terms, Credit Limit serta Exposure = unpaid invoices + confirmed SO yang belum ditagih, termasuk pajak, tanpa menghitung SO/invoice dua kali. C02 NET7 / limit Rp300.000 / exposure Rp220.000 diperiksa pada data yang tersedia. Product menunjukkan identitas/harga, tautan Vendor, dan stock availability bagi role yang diizinkan. Sales line menunjukkan Ordered/Delivered/Remaining; Invoiced Quantity hanya Sales/Owner. Warehouse tidak diberi data invoice tambahan.

## Bukti dan batas

- test:documents: 192 PASS, 0 FAIL; dua jenis detail belum diperiksa dengan record aktual (Credit Note, Internal Transfer) karena tabel kosong. Tidak menambah data hanya untuk menandai tes lulus. Ini bukan seluruh fixture T-01–T-36.
- test:document-actions: formulir detail Opportunity mengirim Lost tanpa alasan dan ditolak; stage tetap. Form detail Invoice mengirim overpayment dan ditolak; total/paid/credited tetap. Tidak ada transaksi sukses diposting pada pengujian ini.
- test:document-links: role boundaries, identifier saldo awal, generic buyer tanpa link palsu, pemisahan vendor/customer payment, nomor bergaris miring, dan penolakan jenis dokumen tidak valid.
- Pemeriksaan tambahan: jumlah Sales/Purchase diperiksa dengan Owner dan Warehouse; Audit dan Reporting ditelusuri ke record nyata. Verifier read-only atas rehearsal Sales/Purchase, Cashier dan Hold tetap PASS.
- Typecheck, lint dan production build lulus. Pemeriksaan visual browser seluruh state/viewport belum selesai; pemeriksaan HTTP tidak disamakan dengan klik UI browser.
- Tidak ada perubahan schema/role/RLS/seed/reset/nominal histori. Data transaksi bersama dipertahankan.

## Kebutuhan PDF yang masih terbuka

Interaksi dokumen ini tidak menyelesaikan seluruh spesifikasi. Lifecycle Quotation/RFQ, master CRUD/perubahan katalog, approval diskon >5–10%, Log Notes persisten, inspeksi retur terpisah, kuantitas stok historis lengkap, user management tulis, seluruh fixture T-01–T-36 dan deployment publik tetap memerlukan implementasi/verifikasi. Ekspor F-21 Optional ditunda. Jangan mengklaim semuanya selesai atau siap produksi.
