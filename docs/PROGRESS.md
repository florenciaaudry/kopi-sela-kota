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
- [x] Menghitung expiry hold di database; UI/server action menetapkan tepat 10 menit dan tidak menerima durasi dari browser. Pengguna mengonfirmasi migrasi 004 sudah diterapkan; belum ada transaksi hold live untuk menguji enforcement end-to-end.
- [x] Menambahkan kontrol role di server action dan database; mutasi tabel tetap ditutup untuk browser dan dilakukan melalui RPC `SECURITY DEFINER`.
- [x] Mengunci idempotency key untuk operasi penting, memeriksa replay dengan payload berbeda, menjaga konsistensi stok dan jurnal dalam satu transaksi, serta memperbaiki urutan lock transfer dan penanganan baris jurnal nol.
- [x] Menghubungkan halaman Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns ke query Supabase dan RPC; tidak memakai localStorage/fixture saat konfigurasi Supabase aktif.
- [x] Menambahkan pilihan pelanggan opsional pada penjualan POS langsung lunas, penyimpanan customer pada struk, dan pemeriksaan konsistensi customer saat replay idempotency; jalur ini tidak membuat piutang atau melonggarkan limit kredit.
- [x] Mengubah generator SQL agar membuat bundle fresh-project [`setup.sql`](../supabase/setup.sql) dan bundle migrasi incremental [`apply-transactions.sql`](../supabase/apply-transactions.sql).
- [x] Menjalankan TypeScript, ESLint, production build, dan parse semua migrasi/bundle setelah audit navigasi, batas hold, dan customer-link POS; hasil aktual dicatat di [Test Results](./test-results.md).

## Audit spesifikasi dan penyempurnaan

- [x] Memeriksa PDF sumber asli yang terbaca lengkap 43 halaman, termasuk dataset, catatan fixture, wireframe, SR-01–SR-20, F-01–F-21, T-01–T-36, ketentuan penyerahan, rubrik, dan refleksi.
- [x] Mengganti matriks stale dengan keterlacakan yang mencatat halaman PDF, file, tes, status bukti, dan gap untuk SR/F/S/T serta paket penyerahan.
- [x] Memperbaiki jumlah navigasi dari 8 app menjadi 7 dan mengelompokkan kartu Home menjadi 4 modul fungsional. Reporting ditempatkan di Home; Retur ditempatkan sebagai kemampuan lintas Inventory/Invoicing, bukan app tambahan.
- [x] Menyelaraskan akses layar/aksi Retur ke peran Warehouse, Finance, dan Owner sesuai wireframe S-17.
- [x] Memperbaiki masa hold POS pada UI/action agar server menentukan 10 menit; menyiapkan migrasi incremental untuk menolak hold baru di atas 10 menit pada database.
- [x] Menambahkan pelanggan opsional untuk penjualan POS langsung lunas, dengan tautan idempoten pada struk. Pengguna mengonfirmasi migrasi 005 sudah diterapkan; query POS terautentikasi berhasil membaca kolom customer_id dan daftar customer.
- [x] Mengulang pemeriksaan visual desktop dan viewport 390px pada dashboard serta seluruh route ERP. Setelah menemukan navigasi aplikasi/workspace terpotong di layar sempit, CSS diubah agar tautan membungkus beberapa baris; pemeriksaan ulang POS menunjukkan seluruh tautan terlihat dan tidak ada overflow horizontal. Typecheck, lint, dan production build kembali lulus.

## Status Supabase dan Owner

- [x] `.env.local` memakai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `.gitignore` mengabaikan `.env.*` kecuali `.env.example`.
- [x] Pengguna melaporkan telah menjalankan setup foundation, membuat user Auth Owner, dan menyiapkan profil sesuai konfirmasi sebelumnya.
- [x] Endpoint Auth project merespons HTTP 200; endpoint REST mengenali project/schema profil dan menolak akses anonim sesuai grant; server lokal membaca `.env.local`; `/login` merespons HTTP 200 dan route ERP mengarahkan sesi anonim ke login.
- [x] Login aktual Owner berhasil; nama profil dan role Owner terbaca, dashboard dan aplikasi sesuai role dimuat, serta sesi bertahan setelah refresh. Password tidak diminta atau disimpan di chat.
- [x] Query terautentikasi untuk produk, lokasi, dan stok berhasil menampilkan 15 SKU, 2 lokasi, dan 480 unit dari Supabase.
- [x] Percobaan awal gagal pada `RAISE` di `create_sales_order`; persen literal dikoreksi menjadi `%%` dan semua `RAISE` di migrasi 001–003 diaudit.
- [x] Dashboard Owner berhasil memanggil `get_owner_dashboard`: AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.000.000; stok 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai Rp4.290.000.
- [x] Modul Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibaca dari Supabase. Data baseline Sales S00001, Lead L00001, PO00001, POS/00001 dan opening journal tampil.
- [x] Pengguna melaporkan migrasi 002–003 terdahulu dan kini mengonfirmasi migrasi 004–005 berhasil diterapkan. Query POS Owner menampilkan selector C06 dan berhasil memilih kolom `pos_receipts.customer_id` tanpa peringatan skema. Bundle [`apply-transactions.sql`](../supabase/apply-transactions.sql) mencakup 002–005; jangan jalankan bundle penuh, seed, atau migrasi lama di DB bersama.
- [x] Verifikasi ulang login Owner dan dashboard; sesi Owner bertahan setelah reload.
- [x] Alur Sales live: S00002 → DN00001 → INV00001 → CP00002, C05, 1 CBW-250, invoice Rp33.000 lunas via Bank. Stok turun 1 saat delivery; jurnal delivery, invoice, dan pembayaran seimbang.
- [x] Alur Purchase live: PO00002 → GR00001 → BILL00001 → VP00002, V01, 1 CBW-250 seharga Rp15.000, lunas via Bank. Receipt menaikkan stok 1; jurnal receipt, bill, dan pembayaran seimbang.
- [x] Sesudah kedua alur, dashboard menunjukkan stok kembali ke baseline 480 unit (10 reserved/470 available), nilai Rp4.290.000; AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.018.000. Opening AR/AP tidak berubah.
- [x] Catatan instalasi laptop baru dan kondisi handoff dibuat di [Panduan Handoff](./handoff.md); README yang sebelumnya stale diperbarui.
- [x] Mempertahankan penolakan SO Sales untuk C06 (COD, limit Rp0) saat belum dibayar. Jalur penjualan POS langsung lunas kini dapat mengaitkan pelanggan pada struk, tanpa membuat piutang; schema/selector terverifikasi baca-saja, tetapi transaksi struk belum diposting.
- [ ] T-01–T-36 belum dijalankan penuh. Hasil aktual: T-04 penolakan limit kredit diuji lewat RPC; T-08 Lost tanpa alasan ditolak di server action; T-14 transfer melebihi Available ditolak; T-18 penerimaan melebihi sisa PO ditolak. T-10 belum dapat dipenuhi karena approval diskon >5% belum tersedia.
- [ ] Tes sukses yang tercatat di atas menulis data persisten pada Supabase bersama atas permintaan pengguna. Jangan ulangi seed, reset, atau hapus transaksi; alur sukses lain harus diuji di project/fixture terisolasi atau dengan persetujuan yang sesuai.

## Sisa pekerjaan / batas verifikasi

- Modul POS memiliki RPC hold multi-item, expiry/cancel, split tender, dan penyelesaian; workflow belum diuji lewat transaksi nyata. Pengguna mengonfirmasi migrasi 004/005, dan UI membuktikan schema customer link terbaca. Hold checkout belum mencatat customer. POS/00001 berstatus Opening Control, bukan sesi Open, dan saat pemeriksaan tidak ada hold aktif; checkout belum diuji agar tidak menambah receipt/jurnal permanen ke database bersama. Expiry dihitung server, tetapi pelepasan status kedaluwarsa dipicu manual melalui RPC/UI; tidak ada scheduler otomatis.
- UI hold POS menyediakan paling banyak dua baris SKU; dukungan cart dengan jumlah baris bebas belum dibuat.
- Kontak pelanggan tidak memiliki halaman Form untuk termin/limit/eksposur; pengaitan pelanggan pada checkout hold belum dibuat.
- Pengeditan katalog/harga, approval diskon Owner >5–10%, laporan periode/drill-down, smart button/Log Notes, dan fitur ekspor F-21 belum lengkap.
- Tampilan List/Kanban/Form serta Search/Filters/Group By belum konsisten di semua modul; kebanyakan halaman transaksi masih form dan tabel.
- T-01–T-36 belum dijalankan penuh terhadap database. Build dan parse SQL bukan bukti transaksi nyata; beberapa penolakan telah diuji langsung melalui aplikasi/database dan dicatat terpisah.
- Tes tersisa perlu memakai fixture PDF yang bersih dan role/akun yang sesuai. Transaksi sukses mengubah data permanen; jangan menandai tes yang belum dijalankan sebagai lulus atau reset project aktif.

## Langkah manual minimum

1. Migrasi 004 dan 005 telah dilaporkan berhasil dijalankan pada Supabase bersama; jangan jalankan ulang. Untuk transaksi POS sukses, gunakan project uji terisolasi atau sepakati dahulu transaksi uji persisten pada database bersama.
2. Laptop baru mengikuti [Panduan Handoff](./handoff.md). Jangan menjalankan SQL/seed pada project bersama yang sudah dipakai.
3. Tes role selain Owner memerlukan akun/profil uji role terkait. Sisa tes mutasi sebaiknya dilakukan pada project uji terisolasi agar saldo baseline bersama tidak tercampur.

## Checkpoint sesi — 6 Nov 2026

- Migrasi 004 (batas hold 10 menit) dan 005 (customer link pada receipt POS direct-sale) telah dikonfirmasi pengguna berhasil dijalankan pada Supabase bersama. Tidak menjalankan ulang seed, migrasi, atau bundle SQL.
- Verifikasi POS terbaru bersifat baca-saja: Owner membuka POS, selector memuat C01–C06 termasuk C06 ber-limit Rp0, dan query receipt dengan `customer_id` sukses. Tidak ada sesi POS berstatus Open maupun hold; sesi `POS/00001` masih `Opening Control`. Hold, checkout, receipt customer-linked, replay idempotency, stok, dan jurnal POS belum diuji dengan mutasi karena perubahan akan persisten pada database bersama.
- Visual desktop telah diperiksa pada dashboard dan delapan route ERP. Pemeriksaan 390px menemukan navigasi aplikasi/workspace yang semula memakai strip scroll horizontal; CSS telah diperbaiki agar semua tautan membungkus beberapa baris. Pengukuran POS setelah perbaikan: lebar dokumen 375px pada viewport 390px, semua tautan terlihat. Halaman login dalam keadaan anonim belum diperiksa.
- Setelah perubahan navigasi, `npm run typecheck`, `npm run lint`, dan `npm run build` lulus. Server preview lokal tetap aktif pada `http://127.0.0.1:3000` (PID 32336); itu bukan pekerjaan coding yang berjalan.
- Pengujian T-01–T-36 belum lengkap; gap implementasi pada daftar di atas tetap berlaku. Prioritas lanjutan adalah membuat/menggunakan Supabase uji terisolasi untuk POS dan fixture bersih, kemudian menguji transaksi beserta persistensi stok/jurnal tanpa mengubah project bersama.
