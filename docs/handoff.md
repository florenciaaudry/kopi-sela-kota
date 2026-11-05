# Panduan handoff — Kopi Sela Kota ERP

## Status handoff

Login Owner, dashboard Supabase, dan satu alur Sales serta Purchase sampai lunas telah berhasil diverifikasi melalui UI pada 5 November 2026. Stok, saldo ringkasan, dokumen pembayaran, dan enam jurnal baru diperiksa sesudah transaksi. Ini membuktikan alur inti yang dicoba dapat berjalan, tetapi bukan sertifikasi seluruh aplikasi: T-01–T-36 belum seluruhnya dijalankan dan gap di bagian akhir dokumen masih berlaku.

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
- Dalam verifikasi 5 November, login Owner, `get_owner_dashboard`, pembacaan modul, serta RPC Sales/Delivery/Invoice/Customer Payment/Purchase Order/Receipt/Vendor Bill/Vendor Payment berhasil digunakan.
- Keberhasilan tiap alur yang dipanggil adalah bukti fungsi yang dibutuhkan alur tersebut tersedia. Tidak ada audit independen terhadap seluruh object/function database.

**Jangan jalankan** `supabase/setup.sql`, `supabase/seed.sql`, atau `supabase/apply-transactions.sql` lagi pada database bersama. Setup dan seed ditujukan untuk project development baru/terisolasi; bundle incremental hanya dipakai jika migrasinya memang belum ada.

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
- Percobaan SO untuk C06 (Pelanggan Tunai, limit Rp0) ditolak karena RPC menerapkan limit kredit ke nilai order Rp33.000. Alur pembayaran Sales berhasil menggunakan C05; dukungan COD melalui Sales perlu diperbaiki atau diarahkan eksplisit ke POS.
- Approval diskon di atas 5% belum tersedia (T-10); pengeditan katalog/harga belum dibangun (T-06).
- POS hold belum diuji live; UI maksimal dua SKU, expiry memerlukan pemicu manual, dan pembayaran hold belum mendukung tender parsial.
- Laporan periode/drill-down dan ekspor F-21 belum lengkap.
- Hak akses seluruh role belum diuji; verifikasi login yang tercatat menggunakan Owner.

Handoff developer untuk melanjutkan proyek dapat dilakukan tanpa error yang menghalangi login Owner atau alur Sales/Purchase yang telah diuji. Ini **bukan** pernyataan bahwa aplikasi lengkap, seluruh test lulus, atau siap produksi.
