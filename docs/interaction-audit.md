# Audit interaksi dokumen — 7 November 2026

## Penyederhanaan visual Back

Navigasi kembali seluruh detail, Quotations/RFQs, Master Data, Inspections dan Receipt memakai tautan ringan `← Sales / S00014`, tanpa kotak putih besar atau teks visual “Back to”. Label aksesibilitas tetap menyebut “Back to …”; hover underline dan fokus keyboard tetap jelas, area klik minimal 40px tinggi. Rantai asal, parameter from, validasi tujuan, serta Save/Discard tidak berubah. Jarak breadcrumb ke judul dipadatkan; tombol aksi utama tetap lebih menonjol.


## Perbaikan Back mengikuti konteks asal

Customer/Product/Vendor yang dibuka dari Sales, Purchase, atau dokumen terkait kini membawa parameter `from` internal tervalidasi. Back mengembalikan halaman asal beserta rantai sebelumnya: Sales → Sales Order → Customer → Back ke Sales Order → Back ke Sales. Buka master langsung tanpa konteks tetap memakai Master Data untuk role yang berhak. URL eksternal/protokol/route tidak dikenal ditolak; tujuan Back tidak memberi hak akses baru. Konteks bertahan setelah Save dan penolakan validasi. Tidak bergantung history browser/referrer/sessionStorage. Receipt, Invoice, CRM Kanban, Reporting dan tautan DataTable memakai konteks yang sama.

Bukti: test:context-navigation memeriksa helper keamanan dan rantai tautan/Back lewat HTML aktual dengan Owner. Ini uji baca-saja, bukan klaim visual browser; tidak ada perubahan transaksi/database.


## Dashboard dan kontrol edit ringkas

Dashboard menampilkan tujuh app sesuai role sebagai isi utama; kartu identitas/account/perusahaan serta pintasan berulang dihapus. Financial Summary selalu terbuka agar tidak terlewat; panduan alur tetap dapat dibuka bila diperlukan. Filter kelompok tetap tersedia dalam disclosure; pencarian app tetap langsung terlihat. Semua label Beranda pada navigasi aktif menjadi Dashboard; nama aplikasi/dokumen Odoo tetap Inggris.

Dokumen memakai Back berupa breadcrumb menuju daftar asal; invoice kembali ke Invoicing, Receipt ke Point of Sale, master menuju Master Data untuk role yang diizinkan. New Quotation/New RFQ menggunakan halaman editor tersendiri (`?new=1`), terpisah dari daftar; tombol New terlihat langsung. Form Quotation/RFQ serta master baru/edit memiliki Save dan Discard di kiri atas form. Discard pada dokumen baru kembali ke daftar. Back memakai label eksplisit Back to Sales/Quotations dan gaya tombol; toolbar tidak menimpa field. Tombol New pada modul memakai flex toolbar tanpa paragraf yang bertumpuk; menu workflow mengikuti konteks modul. Save tetap Server Action/RPC yang ada, menampilkan pending dan konfirmasi sukses; Discard hanya me-reset/remount input lokal dan menutup editor, tanpa menulis database. Dokumen posted/confirmed tetap terkunci sesuai aturan; tidak menambahkan Save palsu pada dokumen baca-saja. Register Payment ditampilkan dalam disclosure.

Peringatan perubahan belum disimpan berlaku pada Back/tautan navigasi, reload/penutupan halaman, serta tindakan lain seperti Confirm/Logout saat ada editor kotor. Save dan Discard tidak memicu peringatan yang tidak perlu. Tombol Back selalu menuju daftar sumber, bukan riwayat browser yang tidak pasti.

Verifikasi: pengujian perilaku guard, HTML route aktual, dan native master forms (create COD0/edit/delete master QA sementara). Visual/viewport otomatis belum diverifikasi karena host browser automation tidak tersedia. Tidak ada migrasi/seed/reset atau perubahan transaksi usaha pada perapian UI ini.


## Verifikasi terbaru — workflow PDF (7 November 2026)

- Migrasi 014–018 aktif: pengguna menjalankan bundle incremental, lalu kelima tabel baru dan RPC diverifikasi langsung lewat Supabase. Jangan jalankan bundle/seed ulang.
- Quotation → approval Owner berbasis revision → Sales Order; RFQ → Purchase Order; master CRUD; Vendor Pricelist; Log Notes persisten; Warehouse Inspection → Return Move → Finance Credit Note sudah diimplementasikan dengan pemeriksaan role/status di database.
- `test:pdf-fixtures`: **36/36 PASS** pada PostgreSQL terisolasi yang memuat migrasi produksi dan seed PDF. Setiap skenario memakai transaksi rollback. Auth memakai identitas uji; pg_cron hanya adapter registrasi; ini bukan 36 pengujian visual browser/live.
- `test:workflow-controls`: **6/6 PASS**, mencakup CRUD, histori, stale approval, snapshot harga, pembatalan RFQ, Log Notes/replay/RLS/private RPC.
- Supabase aktual: **8/8 kelompok PASS** di `live-workflow-results.json`. Q00002 dan RFQ00002 merupakan draft QA dibatalkan; Log Note/audit dipertahankan. Customer QA sementara dihapus. Jumlah dokumen usaha dan stok sebelum/sesudah identik; tidak ada SO/PO/Invoice/Payment baru dari tes ini.
- Form HTML native ke Server Actions: create Customer COD/Credit Limit 0, edit, delete master belum dipakai **PASS** (`master-form-results.json`). Ini menguji jalur aplikasi, bukan hanya RPC.
- Enam role: **180 PASS / 0 FAIL**, termasuk empat URL workflow baru, login/logout nyata, nama tokoh, RLS, dan penolakan aksi lintas role.
- Regresi Receipt menemukan benturan nama variabel yang menyebabkan replay ambigu: diperbaiki migrasi 018. Clean install menemukan MIXED payment sebelum chart seed: migrasi 003 dibuat bergantung ketersediaan akun dan seed memasukkan MIXED setelah chart; **seed bersama tidak dijalankan**.

**Batas yang masih nyata:** Quotation/RFQ baru masih satu Product per dokumen; editor multi-line Sales/Purchase yang diwajibkan wireframe belum selesai. Fixture backend yang lulus tidak menggantikan pengujian visual semua layar/state, Auth nyata untuk setiap transaksi fixture, pengujian seluruh variasi retur lewat browser, deployment publik, atau paket/video penyerahan. Settings user management tulis tetap perlu diselesaikan/verifikasi terpisah. F-21 ekspor Optional ditunda. Jangan menyebut seluruh PDF/produksi selesai.


### Bukti retur terintegrasi aktual

`workflow-return-live-results.json`: PASS. Sales membuat Quotation Q00003 dengan Discount 6%, Owner menyetujui, lalu Sales mengonfirmasi S00014. Warehouse mem-posting DN00019 (1 CBW-250), Finance membuat INV00032 senilai Rp31.020. Warehouse mencatat RI00001 sealed dan Return Move RM-RI00001; Finance mem-posting CN00001 Rp31.020. Replay posting Credit Note menghasilkan referensi sama. Detail Inspection, Return Move, Credit Note dan relasi SO dibaca dari aplikasi.

Semua kuantitas stok perusahaan, piutang belum lunas, dan saldo setiap akun jurnal terposting cocok persis sebelum/sesudah alur. Dokumen bisnis QA dan audit tetap tersimpan; tidak dihapus/reset. Pemeriksaan ini memakai Auth/RPC nyata serta halaman HTTP, bukan klaim klik/visual browser. Pengujian akses enam role: 180 PASS; detail/link: 204 PASS sebelum contoh retur dibuat, 4 jenis tanpa sample saat itu ditandai NOT_TESTED. Kini retur/Return Move/Credit Note punya bukti aktual terpisah; Internal Transfer live belum ditambahkan hanya untuk mengisi laporan.

## Catatan tahap sebelumnya (historis)

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
