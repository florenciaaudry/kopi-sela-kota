# Matriks keterlacakan spesifikasi PDF

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
| 4–7 | SR-01–SR-20, konflik stakeholder, alur Sales/Purchase/POS/Retur, kebijakan biaya, pola interaksi Odoo | `docs/decision-log.md`, migrasi 001–005, `module-page.tsx`, `module-actions.ts`, `layout.tsx` | Tiga konflik utama tetap memerlukan pembelaan/konfirmasi dosen bila keputusan diubah. Banyak kontrol ada, tetapi seluruhnya belum diuji. Pola List/Kanban/Form dan Search/Filters/Group By belum konsisten tersedia. |
| 8–14 | Aturan fixture bersih, pajak, seluruh dataset/master, baseline stok, dokumen historis, akun/jurnal awal, peran | `supabase/seed.sql`, `docs/dataset-mapping.md`, migrasi 001, `src/lib/inventory.ts` | Pemetaan dan baseline awal terdokumentasi. DB bersama telah memiliki transaksi live; angka total stok 480 saat ini tidak berarti kondisinya kembali persis ke seed. |
| 15 | Glosarium dan prioritas Must/Optional | `docs/requirements-traceability.md`, `docs/test-results.md` | Fixture dan istilah digunakan; hasil tes belum lengkap. |
| 15–21 | F-01–F-21 dan kriteria Given/When/Then | Tabel fitur di bawah, `module-page.tsx`, actions, RPC | F-21 satu-satunya fitur Optional. Must yang belum lengkap tidak boleh dinyatakan tertutupi oleh fitur opsional. |
| 22–40 | S-01–S-18, bidang wireframe, status, tampilan, T-01–T-36, bukti | Tabel layar/tes di bawah, `docs/test-results.md` | Desktop visual check seluruh route dan pemeriksaan 390px dilakukan; navigasi mobile kini membungkus baris dan seluruh tautan terlihat. Cakupan field/kontrol masih tidak lengkap pada beberapa layar dan semua transaksi T-01–T-36 belum diuji. |
| 41 | Aturan nama penyerahan, kredensial uji, demo dan format Decision Defense/presentasi | `docs/handoff.md`, `docs/decision-log.md`, `docs/test-results.md` | Panduan dan catatan tersedia; tautan publik, bukti lengkap, video, presentasi dan sesi tanya jawab belum diverifikasi/dibuat. Kredensial tidak boleh masuk video publik. |
| 42 | Rubrik dan bobot penilaian | Matriks ini, `docs/test-results.md`, defect log | Gap aturan, integrasi, pola Odoo dan bukti pengujian masih berdampak pada kategori berbobot; belum ada dasar menyatakan siap penilaian akhir. |
| 43 | Refleksi keputusan dan kesalahan AI, kolaborasi/integritas akademik | `docs/ai-disclosure.md`, `docs/decision-log.md` | Pengungkapan AI tersedia sebagai draf; refleksi tiap anggota dan kemampuan menjelaskan implementasi harus diselesaikan kelompok. |

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
| C06 COD/limit Rp0 | Order Sales yang belum dibayar tetap ditolak ketika eksposur melampaui limit. Jalur transaksi langsung lunas yang tepat adalah POS, bukan menurunkan limit. | Migration 005 dilaporkan diterapkan; query POS menampilkan C06 dan berhasil membaca `pos_receipts.customer_id`. Belum ada transaksi linked receipt aktual; checkout hold belum menyimpan customer. |

## Aturan bisnis SR

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan/risiko |
|---|---:|---|---|---|---|
| SR-01 | 4, 16–17, 31 | `docs/decision-log.md` D-01; `module-actions.ts`; RPC invoice; `module-page.tsx` | T-20; alur Sales live bukan invoice SO sebelum delivery | Dibuat tetapi belum diuji | Keputusan memilih SR-02. Persetujuan dosen diperlukan bila ingin invoice final saat SO; T-20 belum dijalankan pada fixture. |
| SR-02 | 4, 6–7, 17, 31 | `202611050002_transactions.sql`; action invoice; tabel Invoice | T-19–T-20; satu invoice live sesudah delivery 1 unit | Dibuat tetapi belum diuji | T-19/T-20 dengan kuantitas dan baseline PDF belum diuji; harus memastikan tidak ada invoice untuk Delivered 0. |
| SR-03 | 4, 17, 36 | `docs/decision-log.md` D-02; RPC POS/validasi stok | T-30; T-14 hanya uji transfer | Dibuat tetapi belum diuji | Baseline menolak oversell (sesuai SR-04), bertentangan dengan SR-03; uji/keputusan pembelaan dosen diperlukan. |
| SR-04 | 4–5, 17, 19–20, 27–28, 36 | `202611050002_transactions.sql`, `202611050003_pos_workflows.sql`, inventory snapshot | T-14 lulus penolakan; T-09/11/12/13/29/30 belum | Dibuat tetapi belum diuji | Transfer berlebih teruji, tetapi reservasi SO/POS, delivery parsial, dan stok POS belum diuji menyeluruh. |
| SR-05 | 4, 18, 32 | `docs/decision-log.md` D-03; PO/Vendor Bill RPC | T-15, T-21–T-22; alur PO/Bill live hanya kuantitas 1 | Dibuat tetapi belum diuji | Pembayaran/uang muka PO belum ada; keputusan memilih SR-06. Uji three-way match fixture belum dilakukan. |
| SR-06 | 4, 7, 18, 30, 32 | PO receipt/bill RPC; `module-page.tsx` Purchase/Invoicing | T-17–T-18 (T-18 lulus penolakan); satu receipt live accepted 1 | Dibuat tetapi belum diuji | T-17 accepted/rejected 16/4 dan three-way match T-21/22 belum dijalankan. |
| SR-07 | 5, 17, 24, 26 | `module-actions.ts` validasi diskon; Sales Order RPC | T-06, T-09–T-10; T-10 gagal dukungan approval | Dibuat tetapi belum diuji | 0–5% tersedia, tetapi approval Owner untuk >5–10% belum dibuat; >10% harus ditolak. Harga katalog tidak dapat diedit dari UI. |
| SR-08 | 5, 16, 18, 23, 26 | RPC eksposur kredit; Sales/POS UI; migrasi 005 | T-04 lulus penolakan; alur Sales live dengan C05 | Selesai dan terverifikasi (kontrol batas) | T-04 diuji untuk C02; penghitungan seluruh sisa SO dan perpindahan SO→invoice belum diverifikasi dengan seluruh fixture. C06 diarahkan ke POS langsung lunas; tautan struk tersedia di kode tetapi belum diuji live. |
| SR-09 | 5, 7, 20, 38 | RPC Credit Note; `returns/page.tsx`; role Warehouse/Finance/Owner | T-33–T-34 belum | Dibuat tetapi belum diuji | Tidak ada tes batas jumlah/retur ulang, inspeksi restock/non-restock, atau pembalikan jurnal live. Refund pembayaran yang sudah diterima belum tersedia. |
| SR-10 | 5, 7, 20, 28 | `inventory/page.tsx`; `transferInventoryAction`; RPC transfer | T-14 lulus penolakan; T-13 normal belum | Dibuat tetapi belum diuji | Transfer berlebih ditolak; perpindahan normal dan bukti nilai perusahaan/jurnal netral belum diuji. |
| SR-11 | 5, 19, 33 | Payment actions/RPC; Invoice dan Vendor Bill | T-23–T-24 belum; pembayaran Sales/Purchase live lunas penuh | Dibuat tetapi belum diuji | Pembayaran sebagian dan penolakan overpayment belum dibuktikan. |
| SR-12 | 5, 16, 24 | `202611050001_foundation.sql`; `inventory/page.tsx`; products table | T-05 baca live cocok; T-06 belum | Selesai dan terverifikasi (data baca) | Nilai CBW-250/500 terbaca sesuai baseline; duplikasi SKU, edit katalog, dan snapshot SO setelah perubahan belum diuji. |
| SR-13 | 5, 16, 21, 25, 39 | RPC `get_owner_dashboard`; dashboard | T-35–T-36 belum; dashboard saldo live terbaca | Dibuat tetapi belum diuji | Laporan hanya saldo/stok dasar; periode, net sales, PBJT, COGS, margin dan drill-down dokumen belum lengkap. |
| SR-14 | 5–6, 19–21, 29, 34, 36–39 | idempotency pada RPC; audit/journal; `module-actions.ts` | T-16, T-26, T-30, T-32, T-34, T-36 belum | Dibuat tetapi belum diuji | Kunci/replay telah dibangun, tetapi belum diuji ulang pada alur database untuk memastikan tidak ada posting ganda. |
| SR-15 | 5, 15, 21–23, 35, 39 | `roles.ts`, `layout.tsx`, `requireRole`, RLS, audit RPC | T-02, T-28, T-36 belum; Owner login terverifikasi | Dibuat tetapi belum diuji | Hak role Owner dan akses Owner berhasil; seluruh role, akses URL langsung, jejak pelaku/waktu/WIB dan pembatasan Cashier belum diverifikasi. |
| SR-16 | 6, 19, 35 | POS session open/close/variance RPC dan UI | T-27–T-28 belum | Dibuat tetapi belum diuji | Sesi dan persetujuan selisih tersedia pada kode, belum diuji di DB; perlu pastikan closing tidak mem-posting penjualan ulang. |
| SR-17 | 6–7, 14, 19–20, 36–37 | POS hold RPC; `module-actions.ts`; migrasi 004 | T-29–T-32 belum | Dibuat tetapi belum diuji | PDF membatasi maksimum 10 menit. UI/action menetapkan 10 menit dari server dan migrasi 004 dilaporkan diterapkan; trigger belum diuji dengan write/transaksi. Scheduler otomatis belum ada; expiry dipicu RPC/UI. |
| SR-18 | 6, 8, 12, 20, 26, 31, 37 | kalkulasi PBJT RPC; POS receipt | T-09–T-10, T-19–T-20, T-31–T-32 belum | Dibuat tetapi belum diuji | PBJT pada alur Sales live cocok; pembulatan, diskon dan POS tanpa invoice kedua belum diuji lengkap. |
| SR-19 | 6–7, 10, 18, 29–30, 32 | `vendor_pricelist`, receipt/bill RPC | T-15–T-18, T-21–T-22; T-18 lulus penolakan | Dibuat tetapi belum diuji | T-18 menolak accepted melebihi PO; penerimaan parsial/rejected 4 dan rekening barang diterima belum ditagih belum diuji. |
| SR-20 | 6–7, 13–14, 16, 19–22, 29–39 | nomor/status/relation/audit/journal schema dan RPC | T-25–T-26, T-36 belum; 6 jurnal alur live terverifikasi seimbang | Dibuat tetapi belum diuji | Jurnal alur live seimbang, tetapi Log Notes, smart button/tautan rantai dokumen, penguncian pascaposting dan koreksi reversal belum diverifikasi menyeluruh. |

## Fitur wajib/opsional F dan wireframe S

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan |
|---|---:|---|---|---|---|
| F-01 | 15, 22 | `roles.ts`, `layout.tsx`, dashboard, actions | T-01 lulus baca/navigasi; T-02 belum | Dibuat tetapi belum diuji penuh | Owner melihat tepat 7 app dan 4 kelompok; tetap perlu uji menu per role dan penolakan URL jurnal langsung untuk Cashier. |
| F-02 | 16, 23 | Data `customers`, pilihan kontak Sales/POS; `create_pos_sale_for_customer`; migrasi 005 | T-03–T-04; T-04 diuji; schema customer link terbaca live | Dibuat tetapi belum diuji | Belum ada halaman/form Contacts untuk termin/limit/eksposur. Customer link pada receipt direct-sale belum dibuktikan dengan write; checkout hold belum menautkan customer. |
| F-03 | 16, 24 | `inventory/page.tsx`, products, product costs | T-05 baca live; T-06 belum | Dibuat tetapi belum diuji | Daftar stok bukan Form produk; harga jual/edit produk dan validasi duplikasi lewat UI tidak ada. |
| F-04 | 16, 25 | CRM forms/RPC pada `module-page.tsx` | T-07–T-08; hanya penolakan alasan kosong diuji | Dibuat tetapi belum diuji | Kanban, pencarian, dan filter tahap sudah dibuat; Log Notes dan bukti perubahan Lost dengan alasan masih belum lengkap. |
| F-05 | 16–17, 26 | Sales Order action/RPC, Delivery list | T-09–T-12; satu alur live kuantitas 1 | Dibuat tetapi belum diuji | Form/order list ada; detail multibaris, snapshot harga pascakonfirmasi dan smart button belum tersedia/teruji. |
| F-06 | 17, 26 | Discount 0–5% pada Sales form/action/RPC | T-09–T-10; T-10 belum terpenuhi | Dibuat tetapi belum diuji | Approval Owner >5–10% belum dibuat; diskon >10% dan persetujuan/waktu belum dibuktikan. |
| F-07 | 17, 26, 28, 36 | Reservasi Sales, inventory transfer, POS holds | T-09, T-14, T-29–T-30; T-14 lulus penolakan | Dibuat tetapi belum diuji | Available transfer diuji; reservasi lintas Sales/POS dan replay hold belum diuji. |
| F-08 | 17, 27 | `deliver_sales_order` dan Delivery UI | T-11–T-12 belum | Dibuat tetapi belum diuji | Tidak ada bukti Delivery 8/10 lalu backorder 2 dan penolakan sisa berlebih. |
| F-09 | 17, 31 | `invoice_delivered_sales_order`; Invoicing form/table | T-19–T-20; invoice live penuh sesudah delivery 1 | Dibuat tetapi belum diuji | Dasar Delivered ada; kuantitas parsial dan permintaan invoice dengan Delivered 0 belum diuji. |
| F-10 | 18, 23, 26 | RPC perhitungan eksposur dan validasi SO | T-04 lulus penolakan; C05 Sales live | Selesai dan terverifikasi (kontrol blokir) | Kasus SO C03 dalam limit dan perhitungan perpindahan invoice belum diuji; pesan/ruang kredit di form kontak belum tersedia. |
| F-11 | 18, 29 | Purchase form, PO RPC | T-15–T-16; PO live qty 1 | Dibuat tetapi belum diuji | RFQ status sent/PO replay dan harga locked belum diuji dengan fixture 20. |
| F-12 | 18, 30 | Receipt form/action/RPC | T-17–T-18; T-18 lulus penolakan | Dibuat tetapi belum diuji | Alur accepted 16/rejected 4, stok dan jurnal GRNI belum diuji. |
| F-13 | 18, 32 | Vendor Bill RPC dan Invoicing form | T-21–T-22; bill live qty 1 | Dibuat tetapi belum diuji | Three-way match parsial dan penahanan kuantitas rejected belum diuji. |
| F-14 | 19, 34 | Journal schema/RPC, accounting table | T-25–T-26 belum; jurnal enam alur live seimbang | Dibuat tetapi belum diuji | Bukti balancing alur lain tersedia; hitungan persis fixture T-25 dan replay posting T-26 belum. |
| F-15 | 19, 33 | Partial amount field/payment RPC | T-23–T-24 belum; live hanya pembayaran lunas | Dibuat tetapi belum diuji | Partial payment dan overpayment rejection belum diverifikasi. |
| F-16 | 19, 35–36 | POS session/hold RPC dan forms | T-27–T-30 belum | Dibuat tetapi belum diuji | Keranjang multi-SKU dinamis sudah dibuat; auto-expiry scheduler tidak ada; migrasi batas 10 menit dilaporkan terpasang; closing approval belum diuji. |
| F-17 | 20, 37 | Hold completion, `pos_receipt_tenders`, split Cash/Bank; POS direct sale customer link | T-31–T-32 belum; halaman POS dibaca live | Dibuat tetapi belum diuji | Split tender ada pada completion hold; customer link baru tersedia pada penjualan langsung lunas, belum pada hold completion; alur hold/checkout belum ditransaksikan dan partial tender persisten bukan alur mandiri. |
| F-18 | 20, 38 | Credit Note RPC dan `/returns` | T-33–T-34 belum | Dibuat tetapi belum diuji | Inspeksi, batas retur, jurnal pembalikan dan restock/non-restock belum diuji di database. |
| F-19 | 20, 28 | Inventory transfer action/RPC | T-13–T-14; T-14 lulus penolakan | Dibuat tetapi belum diuji | Transfer normal yang menjaga total unit/nilai belum diverifikasi dengan T-13. |
| F-20 | 21, 34, 39 | `get_owner_dashboard`, root dashboard, Accounting | T-25, T-35–T-36 belum | Dibuat tetapi belum diuji | Dashboard hanya saldo dasar, tanpa periode/penjualan/margin/drill-down; Log Notes dan tautan ke sumber tidak ada. |
| F-21 | 21, 39–40 | Belum ada ekspor jurnal/laporan | T-36 | Opsional/ditunda | Dikerjakan setelah seluruh Must berfungsi dan lulus, sesuai PDF. Akses Cashier tetap harus ditolak bila ekspor ditambahkan. |
| S-01 | 22 | `layout.tsx`, `page.tsx`, `roles.ts` | T-01 lulus baca/navigasi; T-02 belum | Dibuat tetapi belum diuji penuh | 7 aplikasi/4 kelompok diverifikasi secara visual untuk Owner; universal Search/Filters/Group By, user/company switcher, Activity, audit/log notes belum ada. |
| S-02 | 23 | `customers` query pada Sales form; belum ada halaman Contacts | T-03–T-04 | Belum dibuat | Tidak tersedia list/form contact dengan credit limit, payment terms, receivable, due date dan dokumen terkait. |
| S-03 | 24 | `inventory/page.tsx` | T-05–T-06 | Dibuat tetapi belum diuji | Tabel stok per SKU ada; kartu/form produk, sales price dan edit katalog tidak lengkap. |
| S-04 | 25 | CRM section `module-page.tsx` | T-07–T-08 | Dibuat tetapi belum diuji | Form/list/tahap dan Kanban dengan pencarian/filter tersedia; nilai weighted, aktivitas dan relasi belum lengkap. |
| S-05 | 26 | Sales form, SO/Delivery table | T-09–T-10 | Dibuat tetapi belum diuji | Hanya satu line per form; status, total/discount snapshot, customer terms dan smart button belum sesuai lengkap. |
| S-06 | 27 | Delivery action dan daftar Delivery | T-11–T-12 | Dibuat tetapi belum diuji | Backorder/sisa per baris dan dokumen form/relasi tidak ditampilkan memadai. |
| S-07 | 28 | Inventory stock table/transfer panel | T-13–T-14 | Dibuat tetapi belum diuji | List ada; Search/Filters/Group By dan transfer Form/detail/status tidak konsisten. |
| S-08 | 29 | Purchase form/PO list/receipt form | T-15–T-16 | Dibuat tetapi belum diuji | RFQ → Sent → PO status dan multibaris belum terlihat; PO live hanya membuktikan satu kuantitas 1. |
| S-09 | 30 | Goods Receipt form dan list pada Purchase | T-17–T-18 | Dibuat tetapi belum diuji | Form menerima/menolak kuantitas; expected screen inspection/reason/accepted vs rejected belum dibuktikan. |
| S-10 | 31 | Invoice form/list di Invoicing | T-19–T-20 | Dibuat tetapi belum diuji | Form status dan detail pajak/line per dokumen belum tersedia; fixture invoice 8 unit belum diuji. |
| S-11 | 32 | Vendor Bill form/list | T-21–T-22 | Dibuat tetapi belum diuji | PO/Receipt/Accepted/Billed detail dan three-way match tidak lengkap di layar. |
| S-12 | 33 | Register payment forms/tabel | T-23–T-24 | Dibuat tetapi belum diuji | Dialog dan saldo sesudah partial/overpayment belum diuji. |
| S-13 | 34 | `accounting` dashboard/journal table | T-25–T-26 | Dibuat tetapi belum diuji | Jurnal list ada; smart button ke asal, line detail yang dapat ditelusuri, reversal, pencarian/filter tidak ada. |
| S-14 | 35 | POS session open/close/variance forms | T-27–T-28 | Dibuat tetapi belum diuji | Kas awal/hitung/approval tersedia; belum diuji dan sesi tidak diuji visual terhadap fixture. |
| S-15 | 36 | POS hold/cart forms; POS direct sale customer selector; migrations 004–005 | T-29–T-30; UI dibaca live | Dibuat tetapi belum diuji | Keranjang hold mendukung tambah/hapus baris produk; validasi server lokal lulus, transaksi live belum diuji; tidak ada sesi POS aktif/hold pada database untuk diuji. Migration 004 dilaporkan diterapkan; customer tidak ditautkan pada hold. |
| S-16 | 37 | POS hold completion/tender/receipt table; customer-linked direct sale receipt | T-31–T-32; schema receipt customer terbaca | Dibuat tetapi belum diuji | Cash/Bank dan relasi customer pada struk direct-sale tersedia di kode; belum ada linked receipt aktual, hold completion tidak mengaitkan customer/related docs, dan partial-tender state belum lengkap. |
| S-17 | 38 | `/returns`, Credit Note form/list | T-33–T-34 | Dibuat tetapi belum diuji | Menu kini lintas Inventory/Invoicing; detail inspeksi/stock move dan link original invoice masih belum memadai. |
| S-18 | 39 | Root dashboard dan `get_owner_dashboard` | T-35–T-36 | Dibuat tetapi belum diuji | Tidak ada date range, Search/Filters/Group By, net sales, PBJT, COGS/margin, drill-down, audit log. |

## Skenario uji T-01–T-36

Status aktual rinci (fixture, harapan, aktual, dan bukti) dicatat di `docs/test-results.md`. “Selesai dan terverifikasi” di bawah hanya berlaku pada kasus/hasil yang disebut, tidak pada seluruh fitur terkait. Tes yang belum dijalankan tidak boleh dianggap lulus karena lint/build sukses.

| ID kebutuhan | Halaman PDF | Implementasi/file terkait | Pengujian | Status | Kekurangan/hasil aktual |
|---|---:|---|---|---|---|
| T-01 | 2, 15, 22, 40 | `layout.tsx`, `roles.ts`, `page.tsx` | Login Owner, jumlah aplikasi, seed read | Selesai dan terverifikasi (baca/navigasi) | Tepat 7 app, 4 kelompok, 15 SKU, 2 lokasi; DB bersama tidak sama persis dengan seed bersih dan role/fixture lain belum diuji. |
| T-02 | 15, 22 | `requireRole`, RLS, journal route | Direct Cashier journal access + refresh S00001 | Belum dibuat untuk bukti uji | Belum ada bukti sesi Cashier menolak URL langsung dan data tetap persis sesudah refresh. |
| T-03 | 16, 23 | customers query, dashboard/role data, POS customer selector and migration 005 | C06 COD/limit 0 and C02 AR/limit | Dibuat tetapi belum diuji | C02 AR/limit terbaca; belum ada Contact Form. Customer link C06 pada POS direct sale sudah tersedia di kode tetapi belum ditransaksikan/refresh-tested di DB. |
| T-04 | 16, 23 | credit exposure RPC, Sales action | SO C02 qty 3 dan status reservasi | Selesai dan terverifikasi (penolakan) | RPC menolak eksposur Rp319.000 terhadap limit Rp300.000; SO/reservasi tidak berubah. |
| T-05 | 16, 24 | products, product_costs, inventory page | Baca CBW-250/500 | Selesai dan terverifikasi (data baca live) | Harga/biaya/stok per SKU cocok dengan data baseline yang dibaca; belum ada form produk. |
| T-06 | 16, 24 | unique SKU schema; belum ada edit katalog UI | Duplicate SKU + ubah catalog dan cek S00001 | Belum dibuat untuk end-to-end | Pengeditan katalog tidak tersedia dari aplikasi; snapshot order setelah perubahan belum diuji. |
| T-07 | 16, 25 | CRM forms/RPC | Qualify L00001 + weighted revenue | Dibuat tetapi belum diuji | RPC/UI tersedia; hasil Rp300.000 × 40% belum dibuktikan pada fixture. |
| T-08 | 16, 25 | `updateLeadStageAction`, CRM RPC | Reject Lost tanpa alasan lalu simpan alasan | Dibuat tetapi belum diuji | Penolakan tanpa alasan terverifikasi; perubahan dengan alasan dan catatan audit belum dijalankan. |
| T-09 | 16–17, 26 | Sales form/RPC, reservation, PBJT | Discount 5% + SO C03 fixture | Dibuat tetapi belum diuji | Diskon ≤5% dapat dikirim; angka Rp313.500/reservasi belum diverifikasi. |
| T-10 | 16–17, 26 | Sales discount action/RPC | Owner approval diskon 6% | Belum dibuat | Approval owner >5–10% belum ada; kode sekarang menolak >5%. |
| T-11 | 17, 27 | delivery RPC/Sales UI | Kirim 8 dari 10, backorder dan COGS | Dibuat tetapi belum diuji | Live delivery hanya 1 unit pada SO 1; bukan fixture parsial T-11. |
| T-12 | 17, 27 | delivery RPC | Tolak kirim 3 saat sisa 2, lalu kirim 2 | Dibuat tetapi belum diuji | Jalur berlebih dan sisa sah belum diuji dalam satu fixture. |
| T-13 | 17, 20, 28 | inventory transfer RPC/UI | Transfer normal 5 unit | Dibuat tetapi belum diuji | T-14 membuktikan penolakan; transfer normal/stok total tetap belum diuji. |
| T-14 | 17, 28 | `transfer_inventory`, inventory UI | Transfer 31 melebihi Available 30 | Selesai dan terverifikasi (penolakan) | RPC menolak; WH 40/10/30 dan CAFE 20/0/20 tidak berubah. |
| T-15 | 18, 29 | Purchase Order RPC/UI | RFQ V01 qty 20, cek stok/utang | Dibuat tetapi belum diuji | PO live qty 1 berhasil; tidak memenuhi kuantitas/fixture T-15. |
| T-16 | 18, 29 | idempotency PO, immutable snapshot | Replay event dan ubah harga PO | Dibuat tetapi belum diuji | Replay identik dan penolakan edit dokumen terkonfirmasi belum diverifikasi. |
| T-17 | 18, 30 | receipt RPC/UI | Datang 20, accepted 16, rejected 4 | Dibuat tetapi belum diuji | Receipt live accepted 1; T-17 baseline, nilai stok dan GRNI belum diuji. |
| T-18 | 18, 30 | `receive_purchase_order` | Accepted 21 melebihi 20 | Selesai dan terverifikasi (penolakan) | RPC menolak; tidak ada Goods Receipt atau perubahan saldo. |
| T-19 | 17, 31 | invoice-delivered RPC/UI | Invoice 8 delivery, cek AR/exposure | Dibuat tetapi belum diuji | Live invoice untuk delivery 1 unit tidak memenuhi angka fixture T-19. |
| T-20 | 17, 31 | invoice-delivered RPC | Invoice SO S00001 dengan Delivered 0 | Dibuat tetapi belum diuji | Penolakan invoice dini belum dijalankan. |
| T-21 | 18, 32 | Vendor Bill RPC/UI | Bill accepted 16 dan rekonsiliasi GRNI | Dibuat tetapi belum diuji | Bill live qty 1 terposting; rekonsiliasi GRNI fixture belum diverifikasi. |
| T-22 | 18, 32 | three-way match RPC | Bill 20 vs accepted 16 | Dibuat tetapi belum diuji | Penahanan selisih 4 tanpa AP belum diuji. |
| T-23 | 19, 33 | customer payment RPC/UI | Partial payment Bank Rp100.000 | Dibuat tetapi belum diuji | Pembayaran live invoice Rp33.000 dibayar lunas; partial settlement belum diuji. |
| T-24 | 19, 33 | vendor payment RPC/UI | Tolak overpayment Rp140.001 | Dibuat tetapi belum diuji | Overpayment dan saldo tidak berubah belum diuji. |
| T-25 | 19, 21, 34 | dashboard/journal RPC/UI | Journal total fixture dan sumber dokumen | Dibuat tetapi belum diuji | Enam jurnal live alur inti seimbang; angka fixture Rp484.000 dan detail drilldown belum diuji. |
| T-26 | 19, 21, 34 | idempotent posting RPC | Replay Receipt/Bill dengan key sama | Dibuat tetapi belum diuji | Jurnal transaksi live satu kali; pengulangan request dengan identitas sama belum diuji. |
| T-27 | 19, 35 | POS session RPC/UI | Buka sesi awal Rp100.000 tanpa penjualan | Dibuat tetapi belum diuji | POS session belum ditransaksikan pada DB uji. |
| T-28 | 19, 35 | POS closing/approval RPC | Variance -Rp1.000, alasan dan approval Owner | Dibuat tetapi belum diuji | Approval selisih belum diuji end-to-end. |
| T-29 | 17, 19, 36 | POS hold RPC/UI, migrasi 004 | Hold 2 CBW-250 + 1 TEH-250, expire 10 menit | Dibuat tetapi belum diuji | Migration 004 dilaporkan diterapkan dan UI menunjukkan 10 menit; tidak ada sesi POS Open sehingga hold belum dibuat/diuji di DB. |
| T-30 | 17, 19, 36 | hold idempotency/cancel/expiry RPC | Replay, over-reservation, cancel, expiry | Dibuat tetapi belum diuji | Ketentuan idempotency ada; tidak ada bukti DB/clock test. |
| T-31 | 20, 37 | hold completion/split tender/ledger; POS direct-sale receipt customer link | Cash Rp39.600 + Bank Rp33.000 | Dibuat tetapi belum diuji | POS split tender/checkout belum diuji live; hold tidak mengaitkan customer. Direct-sale customer link query/read UI terverifikasi, tetapi receipt posting belum diuji di DB. |
| T-32 | 20, 37 | POS completion/payment RPC | Tender belum lengkap, retry, invoice kedua | Dibuat tetapi belum diuji | Tidak ada state tender parsial persisten; belum diuji bahwa percobaan kurang bayar tidak mem-posting apa pun. |
| T-33 | 20, 38 | Credit Note/RPC/return route | Return 2 tersegel + restock | Dibuat tetapi belum diuji | Credit Note dan reverse stock/journal belum diuji di DB. |
| T-34 | 20, 38 | Credit Note idempotency/inspection | Barang rusak, replay, retur melebihi sisa | Dibuat tetapi belum diuji | Batas retur, tidak-restock dan replay belum diuji. |
| T-35 | 21, 39–40 | dashboard RPC/UI | Periode 20 Okt: net sales, PBJT, COGS, margin, saldo | Belum dibuat untuk kebutuhan penuh | Dashboard belum menerima periode dan belum menampilkan net sales/PBJT/COGS/margin yang dapat ditelusuri. |
| T-36 | 21, 39–40 | dashboard, journal role, docs relations | Drill-down invoice→delivery/SO/payment; akses Cashier | Belum dibuat untuk kebutuhan penuh | Tidak ada smart button/tautan rantai dokumen dan test hak Cashier belum jalan; F-21 export opsional. |

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
