# Matriks keterlacakan spesifikasi PDF

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


## Metode dan arti status

Audit menggunakan sumber asli `24SI3 - Group 04 - Coffee Shop.pdf` di folder Downloads. PDF terbaca lengkap, 43 halaman; jumlah halaman dan ekstraksi teks sumber diperiksa langsung. Matriks ini merujuk ke halaman yang tercetak di PDF, bukan nomor halaman viewer. Tabel dataset, catatan fixture, wireframe, aturan, fitur, tes, batasan teknis, dan paket penyerahan ikut diperiksa.

Status yang dipakai:

- **Selesai dan terverifikasi**: perilaku yang disebut telah diperiksa dengan hasil aktual yang cocok; bukan klaim bahwa fitur lain di layar yang sama selesai.
- **Dibuat tetapi belum diuji**: ada implementasi yang relevan, namun uji PDF yang dimaksud belum dijalankan atau baru sebagian.
- **Belum dibuat**: tidak ditemukan alur atau bukti implementasi yang memenuhi kebutuhan.
- **Opsional/ditunda**: fitur Optional yang menurut prioritas PDF ditunda sampai seluruh Must berfungsi dan lulus uji.

Tes live Sales/Purchase yang sebelumnya dicatat memakai kuantitas 1 dan data bersama yang telah berubah. Tes itu membuktikan alur yang dicoba saja, bukan pengganti fixture dan angka T-01–T-36. Semua tes yang meminta seed awal bersih harus dijalankan di project Supabase terisolasi; jangan seed/reset database bersama.

## Audit cakupan halaman

| Halaman PDF | Materi yang diperiksa | Implementasi/dokumen terkait | Hasil audit |
|---|---|---|---|
| 1–2 | Profil usaha, masalah, tujuan, definisi selesai, produk web dan deployment | `README.md`, `docs/handoff.md`, seluruh route `src/app` | Login dan alur Sales/Purchase inti pernah diverifikasi; deployment publik dan keseluruhan definisi selesai belum terpenuhi. |
| 3–4 | Pembagian anggota 1–3, kepemilikan empat modul fungsional, tujuh aplikasi, RACI, dokumen kolaborasi | `docs/role-assignment.md`, `docs/team-agreement.md`, `src/lib/roles.ts` | Aplikasi sempat berjumlah delapan karena Retur tampil sebagai app. Sudah diperbaiki menjadi tujuh dan kartu dashboard dikelompokkan menjadi empat fungsi. Dokumen kelompok masih draf. |
| 4–7 | SR-01–SR-20, konflik stakeholder, alur Sales/Purchase/POS/Retur, kebijakan biaya, pola interaksi Odoo | `docs/decision-log.md`, migrasi 001–009, `module-page.tsx`, `module-actions.ts`, `layout.tsx` | Tiga konflik utama tetap memerlukan pembelaan/konfirmasi dosen bila keputusan diubah. Pola List/Kanban/Form, Search/Filters/Group By sudah dibangun pada bagian utama; kelengkapan field/wireframe dan workflow belum diuji seluruhnya. |
| 8–14 | Aturan fixture bersih, pajak, seluruh dataset/master, baseline stok, dokumen historis, akun/jurnal awal, peran | `supabase/seed.sql`, `docs/dataset-mapping.md`, migrasi 001, `src/lib/inventory.ts` | Pemetaan dan baseline awal terdokumentasi. Angka 480 unit adalah snapshot pengujian historis; DB bersama sudah berubah dan tidak sama persis dengan seed. |
| 15 | Glosarium dan prioritas Must/Optional | `docs/requirements-traceability.md`, `docs/test-results.md` | Fixture dan istilah digunakan; hasil tes belum lengkap. |
| 15–21 | F-01–F-21 dan kriteria Given/When/Then | Tabel fitur di bawah, `module-page.tsx`, actions, RPC | F-21 satu-satunya fitur Optional. Must yang belum lengkap tidak boleh dinyatakan tertutupi oleh fitur opsional. |
| 22–40 | S-01–S-18, bidang wireframe, status, tampilan, T-01–T-36, bukti | Tabel layar/tes di bawah, `docs/test-results.md` | Kode menambahkan pintasan tugas sesuai role, tanggal order/terima, rincian hitungan dan bukti audit untuk Owner. Purchase/POS telah diuji melalui browser dengan sesi Owner/Cashier 7 November; seluruh T-01–T-36 belum lulus lengkap. |
| 41 | Aturan nama penyerahan, kredensial uji, demo dan format Decision Defense/presentasi | `docs/handoff.md`, `docs/decision-log.md`, `docs/test-results.md` | Panduan dan catatan tersedia; tautan publik, bukti lengkap, video, presentasi dan sesi tanya jawab belum diverifikasi/dibuat. Kredensial tidak boleh masuk video publik. |
| 42 | Rubrik dan bobot penilaian | Matriks ini, `docs/test-results.md`, defect log | Gap aturan, integrasi, pola Odoo dan bukti pengujian masih berdampak pada kategori berbobot; belum ada dasar menyatakan siap penilaian akhir. |
| 43 | Refleksi keputusan dan kesalahan AI, kolaborasi/integritas akademik | `docs/ai-disclosure.md`, `docs/decision-log.md` | Pengungkapan AI tersedia sebagai draf; refleksi tiap anggota dan kemampuan menjelaskan implementasi harus diselesaikan kelompok. |

### Bukti retur terintegrasi aktual

`workflow-return-live-results.json`: PASS. Sales membuat Quotation Q00003 dengan Discount 6%, Owner menyetujui, lalu Sales mengonfirmasi S00014. Warehouse mem-posting DN00019 (1 CBW-250), Finance membuat INV00032 senilai Rp31.020. Warehouse mencatat RI00001 sealed dan Return Move RM-RI00001; Finance mem-posting CN00001 Rp31.020. Replay posting Credit Note menghasilkan referensi sama. Detail Inspection, Return Move, Credit Note dan relasi SO dibaca dari aplikasi.

Semua kuantitas stok perusahaan, piutang belum lunas, dan saldo setiap akun jurnal terposting cocok persis sebelum/sesudah alur. Dokumen bisnis QA dan audit tetap tersimpan; tidak dihapus/reset. Pemeriksaan ini memakai Auth/RPC nyata serta halaman HTTP, bukan klaim klik/visual browser. Pengujian akses enam role: 180 PASS; detail/link: 204 PASS sebelum contoh retur dibuat, 4 jenis tanpa sample saat itu ditandai NOT_TESTED. Kini retur/Return Move/Credit Note punya bukti aktual terpisah; Internal Transfer live belum ditambahkan hanya untuk mengisi laporan.

### Struktur aplikasi yang ditetapkan PDF

PDF menetapkan **7 aplikasi** dalam **4 modul fungsional**:

| Modul fungsional | Aplikasi |
|---|---|
| Komersial | Sales, CRM |
| Rantai pasok | Purchase, Inventory |
| Keuangan | Accounting, Invoicing |
| Kasir | Point of Sale |

Reporting adalah menu/kapabilitas laporan, bukan aplikasi kedelapan. Retur dan pemeriksaan barang merupakan kemampuan lintas Inventory dan Invoicing, bukan aplikasi tambahan. Kode awal menampilkan Retur sebagai app kedelapan dan memberi akses Retur kepada Sales, bukan Warehouse. Navigasi kini menampilkan tujuh app, mengelompokkan kartu dashboard dalam empat fungsi, menempatkan Reporting di beranda, serta menyediakan Retur sebagai menu lintas modul bagi Warehouse/Finance/Owner. Perbaikan navigasi ini belum menggantikan kebutuhan layar/detail yang masih kurang.

### Konflik bisnis yang tidak boleh diubah diam-diam

| Konflik | Keputusan saat ini | Dampak/gap dan persetujuan |
|---|---|---|
| SR-01 vs SR-02 | D-01: invoice hanya atas kuantitas Delivered; SO tidak mencatat pendapatan/piutang. | Melindungi pengakuan pendapatan; arus kas Sales lebih lambat. Mengubah ke invoice penuh memerlukan persetujuan dosen. |
| SR-03 vs SR-04 | D-02: tolak penjualan saat Available tidak cukup; stok/reservasi tidak boleh negatif. | Dapat menunda antrean jika stok sistem salah. Override/oversell memerlukan persetujuan dosen; batas kredit tidak terkait dan tidak boleh dilonggarkan untuk C06. |
| SR-05 vs SR-06 | D-03: bill/pembayaran pemasok mengikuti kuantitas diterima-baik; PO tidak menjadi utang/pembayaran. | Pemasok COD dapat menunggu; alur uang muka belum dibangun. Membayar seluruh PO di muka memerlukan persetujuan dosen. |
| C06 COD/limit Rp0 | Order Sales yang belum dibayar tetap ditolak ketika eksposur melampaui limit. Jalur transaksi langsung lunas yang tepat adalah POS, bukan menurunkan limit. | Migration 005 dilaporkan diterapkan; query POS menampilkan C06 dan berhasil membaca `pos_receipts.customer_id`. Direct POS C06 dan Hold C06 kini diuji aktual (POSR00012 dan POSR00022); migration 013 mempertahankan Customer pada Hold/Receipt. Kredit tidak dilonggarkan. |

## Aturan bisnis SR

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan/risiko |
|---|---:|---|---|---|---|
| SR-01 | 4, 16–17, 31 | `docs/decision-log.md` D-01; `module-actions.ts`; RPC invoice; `module-page.tsx` | T-20; alur Sales live bukan invoice SO sebelum delivery | Dibuat tetapi belum diuji | Keputusan memilih SR-02. Persetujuan dosen diperlukan bila ingin invoice final saat SO; T-20 belum dijalankan pada fixture. |
| SR-02 | 4, 6–7, 17, 31 | `202611050002_transactions.sql`; action invoice; tabel Invoice | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-03 | 4, 17, 36 | `docs/decision-log.md` D-02; RPC POS/validasi stok | T-30; T-14 hanya uji transfer | Dibuat tetapi belum diuji | Baseline menolak oversell (sesuai SR-04), bertentangan dengan SR-03; uji/keputusan pembelaan dosen diperlukan. |
| SR-04 | 4–5, 17, 19–20, 27–28, 36 | `202611050002_transactions.sql`, `202611050003_pos_workflows.sql`, inventory snapshot | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-05 | 4, 18, 32 | `docs/decision-log.md` D-03; PO/Vendor Bill RPC | T-15, T-21–T-22; alur PO/Bill live hanya kuantitas 1 | Dibuat tetapi belum diuji | Pembayaran/uang muka PO belum ada; keputusan memilih SR-06. Uji three-way match fixture belum dilakukan. |
| SR-06 | 4, 7, 18, 30, 32 | PO receipt/bill RPC; `module-page.tsx` Purchase/Invoicing | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-07 | 5, 17, 24, 26 | Migrasi014 approval Owner versi/aktor/waktu; workflow-actions/controls | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | 6% memerlukan Owner; edit membatalkan approval; >10% ditolak. Stale approval teruji live; multi-line belum lengkap. |
| SR-08 | 5, 16, 18, 23, 26 | RPC eksposur kredit; Sales/POS UI; migrasi 005 | T-04 lulus penolakan; alur Sales live dengan C05 | Selesai dan terverifikasi (kontrol batas) | T-04 diuji untuk C02; penghitungan seluruh sisa SO dan perpindahan SO→invoice belum diverifikasi dengan seluruh fixture. C06 diarahkan ke POS langsung lunas; tautan struk, Customer C06, dan Cash/Bank diuji live; bukti video-pos-browser-results.json dan video-hold-browser-results.json. |
| SR-09 | 5, 7, 20, 38 | Migrasi016 inspeksi Warehouse → Return Move → Credit Note Finance | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Sealed live RI00001/CN00001 netral stok/ledger setelah pembalikan; damaged/excess/replay teruji terisolasi. Refund lunas belum diaktifkan. |
| SR-10 | 5, 7, 20, 28 | `inventory/page.tsx`; `transferInventoryAction`; RPC transfer | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-11 | 5, 19, 33 | Payment actions/RPC; Invoice dan Vendor Bill | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-12 | 5, 16, 24 | `202611050001_foundation.sql`; `inventory/page.tsx`; products table | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-13 | 5, 16, 21, 25, 39 | financial-report.ts; /reporting; /documents/invoice/[number] | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-14 | 5–6, 19–21, 29, 34, 36–39 | idempotency pada RPC; audit/journal; `module-actions.ts` | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-15 | 5, 15, 21-23, 35, 39 | roles.ts; guards; RLS; audit | 156 PASS/0 FAIL; latihan nyata enam role; audit pelaku cocok | Selesai untuk cakupan akses yang diuji | Bukan kelulusan semua aksi/36 fixture; user management masih baca-saja. |
| SR-16 | 6, 19, 35 | POS session open/close/variance RPC dan UI | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-17 | 6–7, 14, 19–20, 36–37 | POS hold RPC; `module-actions.ts`; migrasi 004/008 | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-18 | 6, 8, 12, 20, 26, 31, 37 | kalkulasi PBJT RPC; POS receipt | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-19 | 6–7, 10, 18, 29–30, 32 | `vendor_pricelist`, receipt/bill RPC | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |
| SR-20 | 6–7, 13–14, 16, 19–22, 29–39 | nomor/status/relation/audit/journal schema dan RPC | T-01–T-36 backend: pdf-fixture-results.json; workflow-controls-results.json; bukti live sesuai bagian terbaru | Kontrol backend terverifikasi; cakupan UI/live dibedakan | Lihat hasil terbaru di awal matriks. Editor multi-line dan audit seluruh state/viewport belum lengkap; hasil backend tidak disamakan dengan seluruh penerimaan UI. |

## Fitur wajib/opsional F dan wireframe S

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan |
|---|---:|---|---|---|---|
| F-01 | 15, 22 | `roles.ts`, `layout.tsx`, dashboard, actions | T-01 lulus baca/navigasi; akses enam role 120 PASS/0 FAIL | Dibuat tetapi belum diuji penuh | Owner melihat tepat 7 app dan 4 kelompok; validasi role/URL diuji. T-02 masih perlu fixture/refresh S00001; semua alur role belum diuji end-to-end. |
| F-02 | 16, 23 | master-controls.tsx; master-data; manage_master (015) | T-03/T-04 isolated PASS; live CRUD dan native forms PASS | CRUD dan kontrol akses terverifikasi | Visual seluruh state Customer dan istilah wireframe belum diaudit ulang lengkap. |
| F-03 | 16, 24 | master-controls.tsx; product detail; manage_master/save_vendor_price | T-05/T-06 isolated PASS; workflow-controls PASS | CRUD, duplikasi dan snapshot backend terverifikasi | UI master Product tersedia; semua variasi form belum diuji lewat browser. |
| F-04 | 16, 25 | CRM forms/RPC pada `module-page.tsx` | T-07–T-08; hanya penolakan alasan kosong diuji | Dibuat tetapi belum diuji | Kanban, pencarian, dan filter tahap sudah dibuat; Log Notes dan bukti perubahan Lost dengan alasan masih belum lengkap. |
| F-05 | 16–17, 26 | quotations; draft-fields; workflow-record-controls; migrasi 014 | T-09–T-12 isolated PASS; draft/approval aktual PASS | Lifecycle satu Product terverifikasi; multi-line belum lengkap | Editor multi-line wajib wireframe belum selesai; konfirmasi live baru belum diposting. |
| F-06 | 17, 26 | approve_quotation_discount; revision/approved_label; migrasi 014 | T-10 isolated PASS; approval 6%, edit7%, reapproval live PASS | Selesai dan terverifikasi untuk approval | Role Sales ditolak approve; perubahan membatalkan persetujuan; >10% ditolak. UI visual seluruh state belum lengkap. |
| F-07 | 17, 26, 28, 36 | Reservasi Sales, inventory transfer, POS holds | T-09, T-14, T-29–T-30; T-14 lulus penolakan | Dibuat tetapi belum diuji | Available transfer diuji; reservasi lintas Sales/POS dan replay hold belum diuji. |
| F-08 | 17, 27 | `deliver_sales_order` dan Delivery UI | T-11–T-12 belum | Dibuat tetapi belum diuji | Tidak ada bukti Delivery 8/10 lalu backorder 2 dan penolakan sisa berlebih. |
| F-09 | 17, 31 | `invoice_delivered_sales_order`; Invoicing form/table | T-19–T-20; invoice live penuh sesudah delivery 1 | Dibuat tetapi belum diuji | Dasar Delivered ada; kuantitas parsial dan permintaan invoice dengan Delivered 0 belum diuji. |
| F-10 | 18, 23, 26 | RPC perhitungan eksposur dan validasi SO | T-04 lulus penolakan; C05 Sales live | Selesai dan terverifikasi (kontrol blokir) | Kasus SO C03 dalam limit dan perhitungan perpindahan invoice belum diuji; pesan/ruang kredit di form kontak belum tersedia. |
| F-11 | 18, 29 | rfqs; save_rfq/confirm_rfq; migrasi 014 | T-15/T-16 isolated PASS; RFQ/cancel aktual PASS | Lifecycle satu Product terverifikasi; multi-line belum lengkap | Editor multi-line dan konfirmasi RFQ baru melalui browser/live masih perlu. |
| F-12 | 18, 30 | Receipt form/action/RPC | T-17–T-18; T-18 lulus penolakan | Dibuat tetapi belum diuji | Alur accepted 16/rejected 4, stok dan jurnal GRNI belum diuji. |
| F-13 | 18, 32 | Vendor Bill RPC dan Invoicing form | T-21–T-22; bill live qty 1 | Dibuat tetapi belum diuji | Three-way match parsial dan penahanan kuantitas rejected belum diuji. |
| F-14 | 19, 34 | Journal schema/RPC, accounting table | T-25–T-26 belum; jurnal enam alur live seimbang | Dibuat tetapi belum diuji | Bukti balancing alur lain tersedia; hitungan persis fixture T-25 dan replay posting T-26 belum. |
| F-15 | 19, 33 | Partial amount field/payment RPC | T-23–T-24 belum; live hanya pembayaran lunas | Dibuat tetapi belum diuji | Partial payment dan overpayment rejection belum diverifikasi. |
| F-16 | 19, 35–36 | POS session/hold RPC dan forms | Regresi hold/replay/tender rollback; T-27–T-30 fixture belum | Dibuat tetapi belum diuji sesuai fixture | Keranjang multi-SKU dinamis; expiry 10 menit server-side; tidak ada scheduler; opening/closing approval dan expiry pada jam fixture belum diuji. |
| F-17 | 20, 37 | Hold completion, `pos_receipt_tenders`, split Cash/Bank; POS direct-sale customer link | Regresi mixed-tender/tender-incomplete/replay rollback; T-31–T-32 fixture/browser belum | Dibuat tetapi belum diuji sesuai fixture | Checkout hold dan split tender telah diuji melalui rollback. Customer link hanya ada pada direct-sale; persistence receipt dengan customer terpilih serta Cashier browser flow belum diuji terpisah. |
| F-18 | 20, 38 | inspections; inspect_customer_return/post_return_inspection; migrasi 016 | T-33/T-34 isolated PASS; RI00001/CN00001 live PASS | Workflow terpisah backend dan live sealed PASS | Warehouse menerima sealed sekali; damaged tidak restock; Finance credit tanpa restock kedua. Refund lunas belum diaktifkan. |
| F-19 | 20, 28 | Inventory transfer action/RPC | T-13–T-14; T-14 lulus penolakan | Dibuat tetapi belum diuji | Transfer normal yang menjaga total unit/nilai belum diverifikasi dengan T-13. |
| F-20 | 21, 34, 39 | document-notes; add_document_note; detail navigation; Reporting | T-35/T-36 isolated PASS; Notes/replay/RLS aktual PASS | Log Notes persisten dan penelusuran terverifikasi sebagian | Semua viewport/state dan stok historis per tanggal masih perlu audit. Ekspor tetap Optional. |
| F-21 | 21, 39–40 | Belum ada ekspor jurnal/laporan | T-36 | Opsional/ditunda | Dikerjakan setelah seluruh Must berfungsi dan lulus, sesuai PDF. Akses Cashier tetap harus ditolak bila ekspor ditambahkan. |
| S-01 | 22 | `layout.tsx`, `page.tsx`, `roles.ts` | T-01 lulus baca/navigasi; T-02 belum | Dibuat tetapi belum diuji penuh | 7 aplikasi/4 kelompok diverifikasi secara visual untuk Owner; universal Search/Filters/Group By, user/company switcher, Activity, audit/log notes belum ada. |
| S-02 | 23 | `customers` query pada Sales form; belum ada halaman Contacts | T-03–T-04 | Belum dibuat | Tidak tersedia list/form contact dengan credit limit, payment terms, receivable, due date dan dokumen terkait. |
| S-03 | 24 | `inventory/page.tsx` | T-05–T-06 | Dibuat tetapi belum diuji | Tabel stok per SKU ada; kartu/form produk, sales price dan edit katalog tidak lengkap. |
| S-04 | 25 | CRM section `module-page.tsx` | T-07–T-08 | Dibuat tetapi belum diuji | Form/list/tahap dan Kanban dengan pencarian/filter tersedia; nilai weighted, aktivitas dan relasi belum lengkap. |
| S-05 | 26 | Sales form, SO/Delivery table | T-09–T-10 | Dibuat tetapi belum diuji | Hanya satu line per form; status, total/discount snapshot, customer terms dan smart button belum sesuai lengkap. |
| S-06 | 27 | Delivery action dan daftar Delivery | T-11–T-12 | Dibuat tetapi belum diuji | Backorder/sisa per baris dan dokumen form/relasi tidak ditampilkan memadai. |
| S-07 | 28 | Inventory stock table/transfer panel | T-13–T-14 | Dibuat tetapi belum diuji | List ada; Search/Filters/Group By dan transfer Form/detail/status tidak konsisten. |
| S-08 | 29 | Purchase form/PO list/receipt form | T-15–T-16 | Dibuat tetapi belum diuji | Daftar kini menampilkan tanggal server order serta kuantitas ordered/accepted/rejected/sisa; RFQ → Sent → PO, multibaris dan fixture penuh belum dibuat/diuji. |
| S-09 | 30 | Goods Receipt form/list dan audit penerimaan pada Purchase | T-17–T-18 | Dibuat tetapi belum diuji | Tanggal/waktu terima, PO asal, rincian accepted/rejected, serta audit actor/waktu untuk Owner ditampilkan; inspeksi/reason barang rusak dan fixture penuh belum lengkap. |
| S-10 | 31 | Invoice form/list di Invoicing | T-19–T-20 | Dibuat tetapi belum diuji | Form status dan detail pajak/line per dokumen belum tersedia; fixture invoice 8 unit belum diuji. |
| S-11 | 32 | Vendor Bill form/list | T-21–T-22 | Dibuat tetapi belum diuji | PO/Receipt/Accepted/Billed detail dan three-way match tidak lengkap di layar. |
| S-12 | 33 | Register payment forms/tabel | T-23–T-24 | Dibuat tetapi belum diuji | Dialog dan saldo sesudah partial/overpayment belum diuji. |
| S-13 | 34 | `accounting` dashboard/journal table | T-25–T-26 | Dibuat tetapi belum diuji | Jurnal list ada; smart button ke asal, line detail yang dapat ditelusuri, reversal, pencarian/filter tidak ada. |
| S-14 | 35 | POS session open/close/variance forms dan bukti Audit Trail | T-27–T-28 | Dibuat tetapi belum diuji | Waktu buka/tutup, pelaku dan waktu approval ditampilkan dari kolom sesi/audit; approval reason Owner belum ada dan alur belum diuji terhadap fixture. |
| S-15 | 36 | POS hold/cart forms; POS direct-sale customer selector; migrations 004–005 | Keranjang dinamis diuji lokal; hold/replay diuji regresi rollback; fixture T-29–T-30 belum | Dibuat tetapi belum diuji sesuai fixture | Hold mendukung baris produk dinamis, expiry 10 menit dari server, dan customer selector pada direct sale. Expiry/cancel fixture dan penyimpanan receipt dengan customer terpilih belum diuji terpisah. |
| S-16 | 37 | POS hold completion/tender/receipt table; customer-linked direct-sale receipt | Mixed tender, incomplete tender, replay diuji melalui rollback; Cashier browser flow belum | Dibuat tetapi belum diuji sesuai fixture | Detail baris/tender receipt tersedia dan direct sale diuji tanpa customer melalui rollback; customer-linked posting dan receipt Cashier sukses end-to-end belum dibuktikan. |
| S-17 | 38 | `/returns`, Credit Note form/list | T-33–T-34 | Dibuat tetapi belum diuji | Menu kini lintas Inventory/Invoicing; detail inspeksi/stock move dan link original invoice masih belum memadai. |
| S-18 | 39 | /reporting; /audit; Invoice detail | Browser aktual + unit fixture + akses lintas role | Dibuat dan sebagian terverifikasi | Period, Net Sales/PBJT/COGS/Margin, saldo, kontribusi jurnal dan tautan invoice tersedia; Search/Group By sumber dan seluruh rantai dokumen belum lengkap. |

## Skenario uji T-01–T-36

Status aktual rinci (fixture, harapan, aktual, dan bukti) dicatat di `docs/test-results.md`. “Selesai dan terverifikasi” di bawah hanya berlaku pada kasus/hasil yang disebut, tidak pada seluruh fitur terkait. Tes yang belum dijalankan tidak boleh dianggap lulus karena lint/build sukses.

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan/hasil aktual |
|---|---:|---|---|---|---|
| T-01 | 2, 15, 22, 40 | `layout.tsx`, `roles.ts`, `page.tsx` | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-02 | 15, 22 | `requireRole`, RLS, journal route | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-03 | 16, 23 | customers query, dashboard/role data, POS customer selector and migration 005 | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-04 | 16, 23 | credit exposure RPC, Sales action | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-05 | 16, 24 | products, product_costs, inventory page | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-06 | 16, 24 | unique SKU schema; belum ada edit katalog UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-07 | 16, 25 | CRM forms/RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-08 | 16, 25 | `updateLeadStageAction`, CRM RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-09 | 16–17, 26 | Sales form/RPC, reservation, PBJT | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-10 | 16–17, 26 | Sales discount action/RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-11 | 17, 27 | delivery RPC/Sales UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-12 | 17, 27 | delivery RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-13 | 17, 20, 28 | inventory transfer RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-14 | 17, 28 | `transfer_inventory`, inventory UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-15 | 18, 29 | Purchase Order RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-16 | 18, 29 | idempotency PO, immutable snapshot | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-17 | 18, 30 | receipt RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-18 | 18, 30 | `receive_purchase_order` | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-19 | 17, 31 | invoice-delivered RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-20 | 17, 31 | invoice-delivered RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-21 | 18, 32 | Vendor Bill RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-22 | 18, 32 | three-way match RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-23 | 19, 33 | customer payment RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-24 | 19, 33 | vendor payment RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-25 | 19, 21, 34 | dashboard/journal RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-26 | 19, 21, 34 | idempotent posting RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-27 | 19, 35 | POS session RPC/UI | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-28 | 19, 35 | POS closing/approval RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-29 | 17, 19, 36 | POS hold RPC/UI, migrasi 004/008 | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-30 | 17, 19, 36 | hold idempotency/cancel/expiry RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-31 | 20, 37 | hold completion/split tender/ledger; POS direct-sale receipt | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-32 | 20, 37 | POS completion/payment RPC | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-33 | 20, 38 | Credit Note/RPC/return route | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-34 | 20, 38 | Credit Note idempotency/inspection | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-35 | 21, 39-40 | financial-report.ts; /reporting | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |
| T-36 | 21, 39-40 | Reporting -> Invoice -> SO/payment; requireRole | scripts/test-pdf-fixtures.mjs; pdf-fixture-results.json | PASS backend PostgreSQL terisolasi | Belum berarti PASS UI/live penuh; lihat cakupan dan keterbatasan pada laporan fixture. |

## Paket penyerahan dan pekerjaan yang menunggu

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian/bukti | Status | Kekurangan |
|---|---:|---|---|---|---|
| DEL-01 Aplikasi web berjalan, deployment publik, akun uji semua role | 1–2, 41 | Next.js, `docs/handoff.md` | Lokal login Owner terverifikasi | Dibuat tetapi belum diuji | Deployment publik dan akun uji semua role belum tersedia/terverifikasi. Jangan menyebut siap deploy atau siap penyerahan. |
| DEL-02 Repositori, README, arsitektur/data, Decision Log, seluruh konflik, tes, defect log, disclosure AI, Role Assignment, Team Agreement, kontribusi | 3–4, 41 | `README.md`, `docs/*` | Dokumen dibaca; tidak ada audit kontribusi individu | Dibuat tetapi belum diuji | Role Assignment/Team Agreement/disclosure masih draf; histori kontribusi dan bukti tiap anggota perlu dilengkapi kelompok. |
| DEL-03 Video demo ≤10 menit, presentasi 15 menit + tanya jawab 10 menit, Decision Defense berbukti | 41, 43 | Belum ada bukti video/presentasi | Belum dijalankan | Belum dibuat | Wajib memuat alur live, konflik, dampak, tes/angka, keterbatasan dan pembelajaran penggunaan AI. |
| DEL-04 Rubrik 100% dan ambang lulus 70% | 42 | Matriks, tes, defect log | Belum ada evaluasi final | Dibuat tetapi belum diuji | Integrasi/aturan bisnis, Decision Log, Odoo/wireframe dan tes masih memiliki gap yang signifikan. |
| DEL-05 Refleksi konflik dan kegagalan AI; seluruh anggota memahami semua modul | 43 | `docs/ai-disclosure.md`, `docs/decision-log.md` | Refleksi individu belum diserahkan | Belum dibuat | Setiap anggota harus menambahkan refleksi berbukti dan mampu membela modul/keputusan lintas modul. |

### Tambahan implementasi 6 November 2026

- S-04: Kanban peluang CRM dengan filter tahap, pencarian, total nilai per tahap, probabilitas, dan alasan Lost tersedia. Perubahan tahap tetap lewat server action yang sudah ada; bukan drag/drop palsu.
- S-15: keranjang hold dinamis, estimasi subtotal/PBJT, validasi input server; tidak mengubah RPC/migrasi.
- S-16: nomor struk membuka /pos/receipt/[number] dengan data database, detail baris/PBJT/tender, dan tombol cetak browser. Role Cashier/Owner diperiksa pada server. Belum diuji dengan struk live pada sesi ini.
- Tabel live module-page memiliki pencarian/filter status/group by atas data yang dimuat; fitur ini bukan pagination atau pencarian seluruh database.

## Koreksi audit ulang 6 November 2026

- F-05: kode create_sales_order langsung menyimpan status Sales Order, locked_at, snapshot harga, dan reservasi; belum ada lifecycle Quotation/draft → konfirmasi. Ini gap implementasi, bukan sekadar belum diuji.
- F-11: kode create_purchase_order langsung menyimpan Purchase Order; RFQ terpisah belum dibuat.
- F-12: accepted/rejected tersedia, tetapi jumlah datang independen belum ada pada input/RPC.
- F-18/SR-15: migrasi 006 sudah diterapkan dengan izin pengguna; guard Credit Note Finance/Owner diverifikasi true. Warehouse kini hanya referensi delivery; workflow inspeksi terpisah masih belum dibuat.
- Akun lima role staf dan laporan test:roles masih belum tersedia saat pemeriksaan file.
- Dropdown PO diperbaiki agar SKU/harga mengikuti vendor dan minimum pricelist. Pemeriksaan live perubahan ini belum dilakukan.

## Hasil login dan akses role aktual — 6 November 2026

- Akun uji keenam role berhasil dibuat pengguna lewat roles:complete; Owner asli tidak diubah.
- Laporan awal 82 PASS/20 FAIL mengandung false positive parser: string not-found ikut pada template script di halaman yang sah. Diperbaiki dengan pemeriksaan HTML h1 aktual, error data, dan digest penolakan 403/404; regression test lulus.
- Satu pengulangan mengalami timeout Owner dan pengulangan lain timeout Procurement/Inventory. Histori disimpan terpisah; retry hanya untuk exception jaringan, bukan hasil izin yang salah.
- Eksekusi akhir: 114 PASS, 0 FAIL. Login/profil keenam role, 48 akses URL, RLS jurnal/akun/biaya, larangan mengubah profil/biaya langsung, larangan insert jurnal langsung, RPC lintas-role, logout dan redirect diperiksa nyata.
- Laporan utama: docs/role-test-results.json. Histori: role-test-results-before-parser-fix.json, role-test-results-owner-transient.json, role-test-results-network-timeout.json. Tidak ada password/token pada laporan.
- Tidak mem-posting transaksi bisnis. Cakupan ini tidak membuktikan semua workflow transaksi, tombol UI, atau T-01–T-36.


## Pembaruan identitas stakeholder — 6 November 2026

PDF halaman 4–6: enam nama stakeholder dipetakan ke enam role pada scenario-identities.json. Tujuh profil database telah dibaca ulang dan cocok; kedua Owner bernama Nadia Prameswari. Script setup mempertahankan nama skenario. Tes enam nama ditambahkan; hasil akses/identitas 120 PASS, 0 FAIL. Status ini hanya menutup ketidaksesuaian identitas; gap fungsi lain tetap terbuka. Lihat docs/scenario-identities.md.


## Owner: Users & Permissions dan Audit Log - 6 November 2026

- /settings dan /audit dijaga requireRole([owner]) di server; menu hanya Owner. Jumlah aplikasi tetap tujuh; Settings bukan role baru atau app tambahan.
- Users menampilkan profil aktual dan matriks akses aplikasi. Ini baca-saja: pembuatan akun, undangan dan perubahan role belum tersedia dari UI. Tidak memakai key admin pada server aplikasi dan tidak memperluas permission database.
- Audit Log membaca audit_events dengan RLS yang sudah ada: pelaku historis, waktu WIB, tindakan dan referensi. Filter dokumen/tindakan/rentang WIB di server; pagination 50 baris. Detail JSON mentah tidak ditampilkan. Nama actor historis tetap dipertahankan.
- 132 PASS / 0 FAIL untuk enam role, termasuk dua URL tambahan: hanya Owner diterima; lima role lain ditolak. Ini bukan 36 tes bisnis. Typecheck, lint awal, kebijakan role dan build produksi terisolasi lulus.
- Browser: 7 profil, 6 role pada matriks, 27 audit events aktual; pencarian PO00002 menghasilkan 1 event; tanggal mulai sesudah akhir ditolak dengan panduan koreksi. Lebar halaman Settings 375 pada viewport 390, tidak melebar ke luar.
- Pesan error modul menyimpan rincian di log server dan menampilkan pemulihan ringkas kepada pengguna. Peringatan layanan yang tidak tersedia tetap ditampilkan; bukan menyembunyikan masalah.
- PDF gabungan diperbarui menjadi v1.1, enam halaman, dengan panduan pengguna, cakupan 132 pemeriksaan dan susunan video progres. Layout semua halaman dirender dan diperiksa.
- Seluruh perubahan agent sebelumnya dipertahankan. Tidak ada migrasi, seed, reset atau posting transaksi usaha pada pekerjaan ini. Gap Quotation/RFQ, approval diskon, inspeksi retur, Reporting lengkap dan T-01-T-36 tetap terbuka.

## Bukti terbaru POS dan video (7 November 2026)


- Cashier Maya menjalani login browser, membuka POS/00005, menjual TEH-250 C06 via Bank pada POSR00012, kemudian Close dengan Counted Cash 100000 / difference 0. UI hanya memilih sesi milik akun sendiri; Owner yang mempunyai sesi lain tidak menutupi pembukaan Cashier. Verifikasi sumber: video-pos-browser-results.json.
- Migrasi 011 menolak direct MIXED tanpa rincian tender; split Cash/Bank tetap lewat Checkout Hold atomik. Migrasi 012 mengecualikan Hold kedaluwarsa dari Available segera dan menjadwalkan cleanup/audit tiap menit via pg_cron. Fungsi housekeeping tidak dapat dieksekusi langsung oleh authenticated/anon. Migrasi 013 mempertahankan Customer dari Hold sampai Receipt dan memperbaiki benturan variabel pada replay Hold.
- Ketiganya telah diterapkan pada proyek tswkkutgqayvxwzepqfs. Regresi terpadu migration-013-regression.json: 9 kelompok checks PASS, stock_unchanged=true, document_counts_unchanged=true. Skenario uji bisnis rollback; hanya fungsi/kolom/job yang dipertahankan. Ini bukan T-01-T-36 fixture bersih.
- Form browser Owner: HOLD/00017 Customer C06, satu TEH-250, Checkout Cash 3300 + Bank 3300 -> POSR00022. Satu struk/jurnal, PBJT 600, stok berkurang 1, Expected Cash sesi bertambah 3300. Dokumen rehearsal ini permanen; bukan reset baseline.
- CRM menampilkan Weighted Revenue dari Expected Revenue dan Probability. Reporting dan struk tetap memakai data nyata; tampilan tidak beralih diam-diam ke demo.
- Cakupan video: overview, konfigurasi/master terbaca, Sales -> Delivery -> Invoice -> Payment, Purchase -> Receipt -> Bill -> Payment, POS -> stock/journal, Reporting/Audit, serta progres/kendala. Semua transaksi yang disebut di atas memiliki bukti aktual. Rekaman/upload YouTube/Moodle tetap perlu dilakukan kelompok.
- Belum lengkap untuk final seluruh PDF: lifecycle Quotation/RFQ; master CRUD; approval diskon >5%; inspeksi retur terpisah; Log Notes/relasi semua dokumen; user management tulis; seluruh fixture T-01-T-36; deployment publik. Jangan menyebut aplikasi 100% atau siap produksi.


## Dokumen dapat dibuka dan menjalankan aksi — 7 November 2026

- Memperbaiki daftar teks pasif: nomor SO/PO/Delivery/Receipt/Bill/Payment/Credit Note/Transfer/Journal/Hold/Session, Product dan Contact kini memiliki detail berotorisasi. List dan Kanban CRM membuka Opportunity. Accounting KPI menuju Reporting; jurnal dan Audit menuju sumber yang sesuai.
- Detail memakai baris nyata, kuantitas sumber, status, smart buttons, hubungan dokumen dan History Owner. Form tindakan dipasang berdasarkan role/status/sisa kuantitas/tagihan; bukan tombol hias. Detail terposting tetap terkunci. Cashier hanya melihat history Hold/Receipt sendiri pada daftar, dengan detail Session/Hold milik sendiri diperiksa di server; tidak ada klaim RLS baru.
- Customer exposure/terms tampil; C02 NET7, limit 300000 dan exposure 220000 diverifikasi. URL nomor bergaris miring diperbaiki. Opening AR/AP dapat dibuka; vendor payment tidak salah menuju customer invoice.
- 192 pemeriksaan detail/link/role lulus, 0 gagal, 2 jenis tanpa record aktual ditandai NOT_TESTED. Penolakan Lost tanpa alasan dan overpayment melalui form detail lulus tanpa perubahan data. Lihat document-details-results.json, document-actions-results.json dan interaction-audit.md.
- Verifier Sales/Purchase, Cashier dan Hold tetap PASS setelah perubahan. Tidak menjalankan migrasi, seed/reset, atau posting sukses baru. Seluruh PDF/T-01–T-36 belum lengkap; gap terperinci tetap dicatat.
