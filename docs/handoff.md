# Panduan handoff — Kopi Sela Kota ERP

## Status handoff

Status diperbarui 6 November 2026 pada baseline `main` / `b40a0d9`. Login Owner, dashboard Supabase, serta alur Sales dan Purchase sampai pembayaran pernah berhasil diverifikasi live. UI terbaru menyediakan app directory berbasis peran, sidebar konsisten, CRM Kanban, pencarian/filter/grouping, dialog transaksi, dynamic POS cart, detail struk yang dapat dicetak, dan pemisahan akses enam role. Ini bukan sertifikasi seluruh aplikasi: T-01–T-36 belum dijalankan penuh dan daftar gap di bawah tetap berlaku.

Tes role terbaru mencatat 120 PASS / 0 FAIL untuk login, profil, nama tokoh skenario, akses route, RLS, batas aksi lintas-role, logout, dan redirect. Regresi CRM/Sales/payment/POS lewat RPC dan rollback juga lulus pada data bersama yang sedang berjalan; regresi tersebut bukan fixture PDF bersih atau uji seluruh UI Cashier. Transaksi uji historis telah diposting ke database bersama dan tetap persisten. Jangan mengulang seed atau menghapus transaksi. Rincian ada di [hasil pengujian](./test-results.md) dan [laporan role](./role-test-results.json).

Satu dokumen gabungan untuk pengguna/klien tersedia di [Panduan Penggunaan dan Hasil Verifikasi](./Panduan-Penggunaan-dan-Verifikasi-Kopi-Sela-Kota.pdf). Panduan tersebut bukan pengganti spesifikasi tugas atau bukti bahwa aplikasi siap produksi.

## Menjalankan di laptop baru

### Prasyarat

- Node.js `>=20.9` dan npm. Versi yang dipakai saat verifikasi: Node `v26.13.0`, npm `11.20.0`.
- Git dan akses ke repository GitHub.
- Akun Supabase Owner yang sudah dibuat di Authentication serta profil dengan role `owner`.

### Clone dan pasang dependency

```powershell
git clone https://github.com/florenciaaudry/kopi-sela-kota.git
cd kopi-sela-kota
npm ci
```

### Konfigurasi lokal

Salin `.env.example` ke `.env.local`, lalu isi:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key-atau-legacy-anon-key>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` adalah nama variabel yang dibaca helper aplikasi; nilainya boleh berupa publishable key Supabase. Gunakan hanya key publik dan andalkan RLS. Jangan menaruh password, `service_role`, atau secret key pada file yang di-commit. `.env.local` diabaikan Git.

### Jalankan dan login

```powershell
npm run dev
```

Buka `http://localhost:3000/login` dan login dengan akun Owner. Kredensial jangan dikirim melalui chat atau disimpan dalam repository.

Verifikasi setelah login:

- Header menampilkan profil dan role Owner.
- Dashboard memuat saldo dari Supabase, bukan demo.
- Route Sales, Purchase, Inventory, Invoicing, dan Accounting terbuka.

Pemeriksaan lokal yang tersedia:

```powershell
npm run typecheck
npm run lint
npm run build
```

Hasil pemeriksaan ulang 6 Nov 2026: typecheck, lint, test:pos-cart, test:rupiah-format, test:role-policy, dan production build Webpack lulus. Build verifikasi memakai `ERP_VERIFY_BUILD=1` dan output `.next-check` agar tidak berbagi folder dengan preview.

## Status database bersama dan migrasi

- Pengguna sebelumnya melaporkan `supabase/setup.sql` berhasil dijalankan, termasuk foundation dan seed baseline, serta user Auth Owner/profil dibuat.
- Pengguna melaporkan foundation/seed dan migrasi 002–003 telah diterapkan; migrasi 004–005 dikonfirmasi diterapkan. Migrasi 006 (batas role posting Credit Note) juga dikonfirmasi berhasil diterapkan.
- Migrasi 007 yang sempat dirancang untuk mengubah pembayaran historis telah dipensiunkan sebelum deployment. Jangan mengubah CP00004 atau jurnalnya tanpa bukti/konfirmasi nominal yang dimaksud.
- Migrasi 008 untuk checkout hold/tender telah diterapkan dan fungsi `complete_pos_hold` aktif cocok dengan sumber lokal setelah normalisasi whitespace. Migrasi 009 untuk detail receipt POS direct-sale dan backfill data lama diverifikasi sesuai jurnal. Detail backfill menambah audit event, tanpa mengubah saldo, stok, waktu transaksi, atau jurnal.
- Bundle [`apply-transactions.sql`](../supabase/apply-transactions.sql) saat ini berisi migrasi lama 002–009 (007 berupa catatan retired/no-op). Bundle ini bukan patch aman untuk project bersama yang sudah menerapkan migrasi; jangan jalankan ulang.
- Regresi terbaru menguji hold multi-tender, sesi tertutup, tender tidak lengkap, replay, direct BANK sale, serta validasi CRM/Sales/pembayaran melalui RPC dalam transaksi rollback. Data stok, jumlah sales, dan jurnal kembali sama setelah rollback. Ini bukan transaksi persisten dan bukan uji PDF baseline.
- UI memilih customer POS dan query schema `pos_receipts.customer_id` berhasil. Posting receipt POS dengan customer terpilih belum dibuktikan terpisah. Uji Cashier end-to-end sukses melalui browser juga belum dilakukan.
- Dalam verifikasi 5 November, login Owner, `get_owner_dashboard`, pembacaan modul, serta RPC Sales/Delivery/Invoice/Customer Payment/Purchase Order/Receipt/Vendor Bill/Vendor Payment berhasil digunakan.
- Keberhasilan tiap alur yang dipanggil adalah bukti fungsi yang dibutuhkan alur tersebut tersedia. Tidak ada audit independen terhadap seluruh object/function database.

**Jangan jalankan** `supabase/setup.sql`, `supabase/seed.sql`, atau `supabase/apply-transactions.sql` pada database bersama. Data bersama tidak lagi sama dengan seed awal; jangan reset, reseed, atau hapus transaksi.

Untuk project Supabase baru yang terisolasi, ikuti [checklist setup](./supabase-setup.md), tinjau file SQL yang akan dijalankan, buat user Auth, lalu buat profil sesuai skema. Jangan menyalin `.env.local` antar laptop atau memasukkan kredensial ke Git.

## Yang berhasil diuji live

- Login Owner dan persistensi sesi setelah reload.
- Dashboard: 15 SKU, 2 lokasi; setelah dua transaksi uji, 480 unit on hand, 10 reserved, 470 available; nilai persediaan Rp4.290.000.
- Sales `S00002` → Delivery `DN00001` → Invoice `INV00001` → Customer Payment `CP00002`: satu CBW-250, invoice Rp33.000 (net Rp30.000 + PBJT Rp3.000), dibayar penuh via Bank.
- Purchase `PO00002` → Goods Receipt `GR00001` → Vendor Bill `BILL00001` → Vendor Payment `VP00002`: satu CBW-250 dari V01 senilai Rp15.000, diterima dan dibayar penuh via Bank.
- Enam jurnal seimbang untuk delivery, invoice, customer payment, receipt, vendor bill, dan vendor payment.
- Saldo akhir setelah Sales dan Purchase: AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.018.000. Piutang dan utang baru lunas; saldo opening AR/AP tetap.
- Penolakan tanpa perubahan data: T-04 kredit melampaui limit, T-08 Lost tanpa alasan (validasi server action), T-14 transfer melebihi Available, dan T-18 jumlah receipt melebihi PO.
- Login/akses role: laporan terbaru 120 PASS / 0 FAIL. Hasil ini mencakup policy/route/auth yang diuji, bukan seluruh alur transaksi melalui UI setiap role.
- Regresi SQL rollback: CRM, Sales, pengiriman parsial/berlebih, invoice, pembayaran parsial/berlebih, hold POS mixed-tender dan direct sale diuji; keadaan stok, sales, dan jurnal tidak berubah setelah rollback.
- POS direct-sale sudah memiliki tampilan detail struk untuk diperiksa/cetak; browser test transaksi tidak mem-posting penjualan.

Rincian, nomor jurnal, dan perhitungan tersedia di [docs/test-results.md](./test-results.md).

## Pekerjaan tersisa dan batasan

- T-01–T-36 belum dijalankan seluruhnya terhadap fixture bersih. Tes transaksi sukses lain dapat menambah dokumen/stok/jurnal persisten.
- SO kredit untuk C06 (COD, limit Rp0) tetap ditolak ketika eksposur melampaui limit. POS langsung lunas menyediakan selector pelanggan dan kolom receipt; persistence dengan customer terpilih belum diuji terpisah.
- Approval diskon di atas 5% belum tersedia (T-10); pengeditan katalog/harga belum dibangun (T-06).
- Contacts lengkap, lifecycle Quotation/RFQ, inspeksi retur Warehouse, laporan periode/drill-down, dan Log Notes/smart buttons lintas dokumen belum lengkap.
- POS hold dan split tender telah memiliki regresi RPC rollback, tetapi checkout sukses Cashier belum diuji melalui browser. Detail customer-linked belum diuji terpisah. Jangan menambah transaksi ke database bersama hanya untuk menandai tes lulus.
- Pintasan tugas per role ditambahkan pada Beranda. Purchase menampilkan tanggal order/terima, jumlah per PO dan bukti audit penerimaan yang hanya dibaca Owner; POS menampilkan bukti actor/waktu audit untuk persetujuan kas. Pemeriksaan browser dengan sesi aktif belum dilakukan setelah perubahan; pengujian login tetap harus memakai akun test/fixture, bukan mengubah transaksi bersama.
- Belum ada lampiran file/foto bukti atau catatan persetujuan Owner yang wajib diisi; bukti yang ditampilkan adalah metadata audit dan alasan selisih kas yang sudah dicatat.
- Build terbaru tersedia pada `http://127.0.0.1:3001` (preview PID 15660); diperlukan login ulang untuk memeriksa layar Purchase/POS pascaperubahan. Server preview lama 3000 juga tetap aktif.
- Ekspor F-21 bersifat opsional pada PDF, dan belum dibuat.
- Semua enam role sudah diuji pada akses/login, tetapi seluruh workflow transaksi per role belum diuji end-to-end di browser.
- UI list, Kanban CRM, form dialog, Search/Filters/Group By sudah ada pada bagian yang dicatat; app switcher mobile bergaya grid dan navigasi role-based telah diperjelas. Kesesuaian field wajib semua wireframe dan inspeksi visual setiap state belum selesai.
- Pemeriksaan visual beranda, menu, Sales, Returns, dialog dan viewport mobile tercatat; login anonim serta semua layar/state belum diperiksa lengkap.

Handoff developer untuk melanjutkan proyek dapat dilakukan tanpa error yang menghalangi login Owner atau alur Sales/Purchase yang telah diuji. Ini **bukan** pernyataan bahwa aplikasi lengkap, seluruh test lulus, atau siap produksi.

## Petunjuk sesi berikutnya

Lanjutkan dari commit Git terbaru dan baca `docs/PROGRESS.md`, `docs/handoff.md`, `docs/test-results.md`, `docs/requirements-traceability.md`, serta panduan PDF. Jangan membuat ulang proyek. Jangan mengulang seed, setup, bundle transaksi, atau migrasi 002–009 pada Supabase bersama. Migrasi 007 adalah retired/no-op dan bukan koreksi data. Jangan melakukan mutasi pada database bersama tanpa izin eksplisit. Siapkan project uji terisolasi dan fixture PDF bersih untuk menyelesaikan verifikasi transaksi dan T-01–T-36. Catat hasil aktual; jangan mengklaim aplikasi lengkap atau siap produksi.
