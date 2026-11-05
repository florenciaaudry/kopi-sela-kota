# Progress

## Landasan proyek

- [x] Menelaah PDF spesifikasi 43 halaman, termasuk SR-01–SR-20, F-01–F-21, wireframe, dataset, dan T-01–T-36.
- [x] Mencatat konflik kebutuhan dan keputusan baseline di [Decision Log](./decision-log.md).
- [x] Menyusun dokumentasi arsitektur, matriks keterlacakan, pemetaan dataset, test results, defect log, pengungkapan AI, serta dokumen tim draf.
- [x] Menyiapkan migrasi pondasi, seed baseline, autentikasi Supabase, RLS baca, role Owner/staf, dan halaman login.
- [x] Mempertahankan mode demo lokal berlabel jelas hanya jika Supabase sama sekali belum dikonfigurasi; error konfigurasi/database tidak dialihkan ke demo.

## Integrasi transaksi

- [x] Membuat migrasi transaksi bertahap `202611050002_transactions.sql` dengan RPC untuk Sales Order, Delivery, Invoice, pembayaran, PO, Receipt, Vendor Bill, transfer, sesi/penjualan POS sederhana, Credit Note, CRM, audit, serta ringkasan Owner/Finance.
- [x] Menambahkan workflow POS multi-item: hold, reservasi, pembatalan, expiry, penyelesaian, split tender, detail struk, dan jurnal.
- [x] Menghitung expiry hold di database dari durasi terbatas (1–1440 menit); replay dengan key, barang, kuantitas, dan durasi sama mengembalikan hold lama tanpa reservasi baru atau perpanjangan expiry.
- [x] Menambahkan kontrol role di server action dan database; mutasi tabel tetap ditutup untuk browser dan dilakukan melalui RPC `SECURITY DEFINER`.
- [x] Mengunci idempotency key untuk operasi penting, memeriksa replay dengan payload berbeda, menjaga konsistensi stok dan jurnal dalam satu transaksi, serta memperbaiki urutan lock transfer dan penanganan baris jurnal nol.
- [x] Menghubungkan halaman Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns ke query Supabase dan RPC; tidak memakai localStorage/fixture saat konfigurasi Supabase aktif.
- [x] Mengubah generator SQL agar membuat bundle fresh-project [`setup.sql`](../supabase/setup.sql) dan bundle migrasi incremental [`apply-transactions.sql`](../supabase/apply-transactions.sql).
- [x] Menjalankan TypeScript, ESLint, production build, dan PostgreSQL static parse setelah perubahan POS; hasil rinci ada di [Test Results](./test-results.md).

## Status Supabase dan Owner

- [x] `.env.local` memakai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `.gitignore` mengabaikan `.env.*` kecuali `.env.example`.
- [x] Pengguna melaporkan telah menjalankan setup foundation, membuat user Auth Owner, dan menyiapkan profil sesuai konfirmasi sebelumnya.
- [x] Endpoint Auth project merespons HTTP 200; endpoint REST mengenali project/schema profil dan menolak akses anonim sesuai grant; server lokal membaca `.env.local`; `/login` merespons HTTP 200 dan route ERP mengarahkan sesi anonim ke login.
- [x] Login aktual Owner berhasil; nama profil dan role Owner terbaca, dashboard dan aplikasi sesuai role dimuat, serta sesi bertahan setelah refresh. Password tidak diminta atau disimpan di chat.
- [x] Query terautentikasi untuk produk, lokasi, dan stok berhasil menampilkan 15 SKU, 2 lokasi, dan 480 unit dari Supabase.
- [x] Percobaan awal gagal pada `RAISE` di `create_sales_order`; persen literal dikoreksi menjadi `%%` dan semua `RAISE` di migrasi 001–003 diaudit.
- [x] Dashboard Owner berhasil memanggil `get_owner_dashboard`: AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.000.000; stok 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai Rp4.290.000.
- [x] Modul Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibaca dari Supabase. Data baseline Sales S00001, Lead L00001, PO00001, POS/00001 dan opening journal tampil.
- [ ] Pengguna melaporkan bundle migrasi transaksi 002–003 telah dijalankan. `get_owner_dashboard` serta query baca modul berhasil dipakai, tetapi eksekusi keseluruhan bundle dan seluruh object migrasi belum diverifikasi independen; jangan mengulang setup/seed atau menganggap semua workflow sudah teruji.
- [x] Verifikasi ulang login Owner dan dashboard; sesi Owner bertahan setelah reload.
- [x] Alur Sales live: S00002 → DN00001 → INV00001 → CP00002, C05, 1 CBW-250, invoice Rp33.000 lunas via Bank. Stok turun 1 saat delivery; jurnal delivery, invoice, dan pembayaran seimbang.
- [x] Alur Purchase live: PO00002 → GR00001 → BILL00001 → VP00002, V01, 1 CBW-250 seharga Rp15.000, lunas via Bank. Receipt menaikkan stok 1; jurnal receipt, bill, dan pembayaran seimbang.
- [x] Sesudah kedua alur, dashboard menunjukkan stok kembali ke baseline 480 unit (10 reserved/470 available), nilai Rp4.290.000; AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.018.000. Opening AR/AP tidak berubah.
- [x] Catatan instalasi laptop baru dan kondisi handoff dibuat di [Panduan Handoff](./handoff.md); README yang sebelumnya stale diperbarui.
- [ ] SO untuk C06 (Pelanggan Tunai, limit Rp0) ditolak RPC dengan eksposur Rp33.000; skenario Sales sampai pembayaran berhasil dengan C05 ber-limit kredit. Alur COD melalui Sales perlu diperbaiki atau dijelaskan sebagai POS.
- [ ] T-01–T-36 belum dijalankan penuh. Hasil aktual: T-04 penolakan limit kredit diuji lewat RPC; T-08 Lost tanpa alasan ditolak di server action; T-14 transfer melebihi Available ditolak; T-18 penerimaan melebihi sisa PO ditolak. T-10 belum dapat dipenuhi karena approval diskon >5% belum tersedia.
- [ ] Tes sukses yang tercatat di atas menulis data persisten pada Supabase bersama atas permintaan pengguna. Jangan ulangi seed, reset, atau hapus transaksi; alur sukses lain harus diuji di project/fixture terisolasi atau dengan persetujuan yang sesuai.

## Sisa pekerjaan / batas verifikasi

- Modul POS memiliki RPC hold multi-item, expiry/cancel, split tender, dan penyelesaian; migrasi dilaporkan telah diterapkan tetapi alur-alur tersebut belum diuji lewat transaksi nyata. Expiry saat ini dilepas saat RPC expiry dipanggil (tersedia tombol UI), belum ada scheduler otomatis.
- UI hold POS menyediakan paling banyak dua baris SKU; dukungan cart dengan jumlah baris bebas belum dibuat.
- Pengeditan katalog/harga dan fitur ekspor F-21 belum dibangun.
- T-01–T-36 belum dijalankan penuh terhadap database. Build dan parse SQL bukan bukti transaksi nyata; beberapa penolakan telah diuji langsung melalui aplikasi/database dan dicatat terpisah.
- Tes tersisa perlu memakai fixture PDF yang bersih dan role/akun yang sesuai. Transaksi sukses mengubah data permanen; jangan menandai tes yang belum dijalankan sebagai lulus atau reset project aktif.

## Langkah manual minimum

1. Tidak ada SQL tambahan yang perlu dijalankan untuk migrasi transaksi 002–003 yang sudah diterapkan. Jangan jalankan ulang `setup.sql`, seed, atau bundle incremental.
2. Laptop baru mengikuti [Panduan Handoff](./handoff.md). Jangan menjalankan SQL/seed pada project bersama yang sudah dipakai.
3. Tes role selain Owner memerlukan akun/profil uji role terkait. Sisa tes mutasi sebaiknya dilakukan pada project uji terisolasi agar saldo baseline bersama tidak tercampur.
