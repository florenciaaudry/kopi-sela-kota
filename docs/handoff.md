# Panduan handoff — Kopi Sela Kota ERP

## Status handoff

Login Owner, dashboard Supabase, dan satu alur Sales serta Purchase sampai lunas telah berhasil diverifikasi melalui UI pada 5 November 2026. Pada 6 November, navigasi mobile diperbaiki setelah pemeriksaan 390px menemukan strip menu terpotong; typecheck, lint, production build, dan pemeriksaan ulang visual POS lulus. Ini membuktikan alur inti yang dicoba dapat berjalan, tetapi bukan sertifikasi seluruh aplikasi: T-01–T-36 belum seluruhnya dijalankan dan gap di bagian akhir dokumen masih berlaku.

Transaksi uji telah diposting ke database Supabase bersama dan bersifat persisten. Jangan mengulang seed atau menghapus transaksi. ID dokumen dan saldo akhir tercatat di [hasil pengujian](./test-results.md).

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

## Status database bersama dan migrasi

- Pengguna sebelumnya melaporkan `supabase/setup.sql` berhasil dijalankan, termasuk foundation dan seed baseline, serta user Auth Owner/profil dibuat.
- Pengguna juga melaporkan menjalankan `supabase/apply-transactions.sql`. Bundle tersebut berisi migrasi 002 (`202611050002_transactions.sql`) dan 003 (`202611050003_pos_workflows.sql`), tanpa seed.
- Audit kesesuaian PDF menambahkan migrasi incremental 004 untuk membatasi hold POS maksimum 10 menit dan 005 untuk mencatat pelanggan pada struk POS langsung lunas. Pengguna mengonfirmasi keduanya berhasil diterapkan; pemeriksaan UI baca-saja berhasil mengambil `customer_id` dari `pos_receipts`. Jangan menjalankan ulang migration, `setup.sql`, seed, atau bundle penuh.
- Verifikasi POS terbaru bersifat baca-saja: Owner melihat pilihan pelanggan C01–C06, termasuk C06 ber-limit Rp0, dan daftar struk dapat dibaca dengan field customer. Tidak ada sesi POS berstatus `Open` (sesi `POS/00001` masih `Opening Control`) dan tidak ada hold aktif, sehingga checkout hold dan penjualan customer-linked belum diuji melalui mutasi database. Tidak ada receipt/jurnal/stok POS baru yang dibuat selama pemeriksaan ini.
- Dalam verifikasi 5 November, login Owner, `get_owner_dashboard`, pembacaan modul, serta RPC Sales/Delivery/Invoice/Customer Payment/Purchase Order/Receipt/Vendor Bill/Vendor Payment berhasil digunakan.
- Keberhasilan tiap alur yang dipanggil adalah bukti fungsi yang dibutuhkan alur tersebut tersedia. Tidak ada audit independen terhadap seluruh object/function database.

**Jangan jalankan** `supabase/setup.sql`, `supabase/seed.sql`, atau `supabase/apply-transactions.sql` lagi pada database bersama. File `apply-transactions.sql` telah diperbarui menjadi bundle 002–005; karena migrasi tersebut sudah dijalankan, bundle penuh akan mengulang migrasi lama.

Untuk project Supabase baru yang terisolasi, ikuti [checklist setup](./supabase-setup.md), tinjau file SQL yang akan dijalankan, buat user Auth, lalu buat profil sesuai skema. Jangan menyalin `.env.local` antar laptop atau memasukkan kredensial ke Git.

## Yang berhasil diuji live

- Login Owner dan persistensi sesi setelah reload.
- Dashboard: 15 SKU, 2 lokasi; setelah dua transaksi uji, 480 unit on hand, 10 reserved, 470 available; nilai persediaan Rp4.290.000.
- Sales `S00002` → Delivery `DN00001` → Invoice `INV00001` → Customer Payment `CP00002`: satu CBW-250, invoice Rp33.000 (net Rp30.000 + PBJT Rp3.000), dibayar penuh via Bank.
- Purchase `PO00002` → Goods Receipt `GR00001` → Vendor Bill `BILL00001` → Vendor Payment `VP00002`: satu CBW-250 dari V01 senilai Rp15.000, diterima dan dibayar penuh via Bank.
- Enam jurnal seimbang untuk delivery, invoice, customer payment, receipt, vendor bill, dan vendor payment.
- Saldo akhir setelah Sales dan Purchase: AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.018.000. Piutang dan utang baru lunas; saldo opening AR/AP tetap.
- Penolakan tanpa perubahan data: T-04 kredit melampaui limit, T-08 Lost tanpa alasan (validasi server action), T-14 transfer melebihi Available, dan T-18 jumlah receipt melebihi PO.

Rincian, nomor jurnal, dan perhitungan tersedia di [docs/test-results.md](./test-results.md).

## Pekerjaan tersisa dan batasan

- T-01–T-36 belum dijalankan seluruhnya terhadap fixture bersih. Tes transaksi sukses lain dapat menambah dokumen/stok/jurnal persisten.
- SO kredit untuk C06 (COD, limit Rp0) ditolak karena RPC menerapkan limit ke nilai order Rp33.000. Form penjualan POS langsung lunas kini dapat memilih pelanggan dan menyimpan relasi pada struk melalui migrasi 005; jalur ini tidak membuat piutang atau mengubah limit. Belum diuji dalam transaksi database, dan checkout hold belum menautkan pelanggan.
- Approval diskon di atas 5% belum tersedia (T-10); pengeditan katalog/harga belum dibangun (T-06).
- POS menampilkan C06 sebagai pilihan pelanggan dan membaca kolom customer pada struk; belum ada struk customer-linked aktual. Sesi yang terlihat hanya `POS/00001` berstatus Opening Control, tidak ada sesi aktif/hold; transaksi POS langsung atau checkout hold belum diuji setelah migrasi karena akan menambah histori persisten. Hold UI membatasi dua SKU dan expiry dihitung server; pelepasan expired dipicu manual, tanpa scheduler.
- Laporan periode/drill-down, smart button/Log Notes, dan ekspor F-21 belum lengkap.
- Matriks audit seluruh PDF sudah diperbarui. Pola List/Kanban/Form, Search/Filters/Group By dan pemeriksaan visual semua layar masih belum selesai.
- Hak akses seluruh role belum diuji; verifikasi login yang tercatat menggunakan Owner.
- Pemeriksaan visual desktop dilakukan pada dashboard dan delapan route ERP. Pada viewport 390px, navigasi aplikasi dan workspace kini membungkus menjadi beberapa baris; pengukuran POS menunjukkan lebar dokumen 375px dan seluruh tautan terlihat. Login dalam sesi anonim belum diperiksa. Setelah perubahan tampilan, `npm run typecheck`, `npm run lint`, dan `npm run build` lulus.

Handoff developer untuk melanjutkan proyek dapat dilakukan tanpa error yang menghalangi login Owner atau alur Sales/Purchase yang telah diuji. Ini **bukan** pernyataan bahwa aplikasi lengkap, seluruh test lulus, atau siap produksi.

## Petunjuk sesi berikutnya

Lanjutkan dari checkpoint Git terbaru dan baca `docs/PROGRESS.md`, `docs/handoff.md`, `docs/test-results.md`, serta `docs/requirements-traceability.md`. Jangan membuat ulang proyek. Jangan mengulang seed, setup, bundle transaksi, atau migrasi 004/005 pada Supabase bersama. Jangan melakukan mutasi POS pada database bersama tanpa izin eksplisit karena receipt, stok, jurnal, dan log bersifat persisten. Siapkan project uji terisolasi dan fixture PDF bersih untuk menyelesaikan verifikasi hold/replay/expiry, checkout/split tender/customer link, konsistensi stok-jurnal, lalu T-01–T-36. Catat hasil aktual, termasuk yang gagal atau belum bisa diuji; jangan mengklaim audit/aplikasi lengkap.
