# Panduan handoff — Kopi Sela Kota ERP

## Pembaruan workflow terbaru

Migrasi 014–018 telah diterapkan dan diverifikasi. Login/akses enam role 180 PASS, detail/link 204 PASS, fixture backend T-01–T-36 36 PASS, enam regresi workflow terisolasi PASS. Quotation, approval, RFQ, master CRUD, Log Notes dan inspeksi retur tersedia. Alur aktual Q00003 → S00014 → DN00019 → INV00032 → RI00001 → CN00001 berhasil, stok/piutang/saldo akun kembali persis semula sesudah retur penuh tersegel. Bukti di workflow-return-live-results.json.

Jangan jalankan ulang setup.sql, seed, apply-transactions.sql, atau apply-pending-workflows.sql pada database bersama. Laptop baru cukup pull/clone, npm ci, .env.local pribadi, npm run dev. File kredensial QA/admin tetap lokal, bukan Git. Editor multi-line Sales/Purchase, seluruh uji visual dan deployment publik belum lengkap; angka tes backend bukan sertifikasi seluruh PDF.

## Status handoff

Status diperbarui 7 November 2026. Login enam role, alur browser Sales/Purchase/POS, Reporting dan integritas Hold memiliki bukti pengujian. Navigasi memakai Apps switcher pada topbar dan area kerja lebar penuh; CRM menyediakan List dan Kanban. Seluruh PDF/T-01–T-36 belum lengkap; lihat gap dan hasil terbaru di bawah.

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

## Status database bersama dan migrasi — 7 November 2026

Migrasi aktif 001–006, 008–013 diterapkan; 007 adalah retired/no-op. Perbaikan terbaru 010–013 sudah teruji di project yang sama. Jangan menjalankan ulang seed, setup.sql, apply-transactions.sql, atau migrasi lama pada database bersama. Bundle untuk instalasi project baru memerlukan pg_cron. Job expiry aktif tiap menit; fungsi housekeeping tidak bisa dipanggil langsung oleh anon/authenticated.

Database berisi transaksi rehearsal permanen. Jangan mengembalikan saldo ke baseline PDF. CP00004 tercatat Rp330 dan tidak dikoreksi diam-diam. Gunakan data saat ini sebelum/sesudah demonstrasi.

## Bukti yang berhasil diverifikasi

- 156 PASS / 0 FAIL untuk login/profil/nama enam role, 12 URL, batas akses/RLS tertentu dan logout. Ini bukan seluruh 36 tes bisnis.
- Sales formulir browser: S00008 → DN00008 → INV00015 → CP00016, satu CBW-250, total Rp33.000 via Bank.
- Purchase formulir browser: PO00004 → GR00003 → BILL00005 → VP00006, satu CBW-250 diterima baik, dibayar Rp15.000 via Bank. Enam jurnal kedua alur seimbang; Bank +18000, stok/nilai persediaan netral.
- Cashier Maya melalui browser: POS/00005 → POSR00012, TEH-250 C06 Bank Rp6.600, kemudian Closed dengan kas Rp100.000 / selisih nol. Cashier menggunakan sesi sendiri.
- Owner melalui browser: HOLD/00017 C06 → POSR00022, Cash Rp3.300 + Bank Rp3.300. Satu receipt/jurnal, PBJT Rp600, reservation consumed. Customer tersimpan sampai struk.
- Sembilan kelompok regresi SQL rollback lulus, termasuk partial Delivery/invoice lanjutan, pembayaran parsial/overpay, replay, expiry dan Customer Hold. Stok dan jumlah dokumen tetap. Lihat migration-013-regression.json.
- Reporting periode/saldo, drill-down jurnal dan detail invoice/payment diuji. Struk menolak printing bila rincian/tender tidak lengkap. Users & Permissions baca-saja dan Audit Log berjalan untuk Owner.
- Pemeriksaan teknis, sumber saldo, dan bukti berada pada test-results.md, role-test-results.json, video-*-results.json, expiry-scheduler-results.json. PDF pengguna tunggal: Panduan-Penggunaan-dan-Verifikasi-Kopi-Sela-Kota.pdf v1.3.

## Batasan dan lanjutan

Belum lengkap terhadap seluruh PDF: lifecycle Quotation/RFQ; master CRUD; approval diskon >5–10%; inspeksi retur terpisah; Log Notes dan seluruh relasi/detail dokumen; user management tulis; kuantitas stok historis; semua fixture T-01–T-36; deployment publik. F-21 optional ditunda. Jangan menyatakan 100% atau siap produksi.

Preview terbaru http://127.0.0.1:3000. Server yang tetap hidup adalah preview, bukan pekerjaan coding yang masih berjalan. Port 3001 adalah preview lama dan tidak menjadi rujukan video terbaru.

Kelompok masih perlu merekam maksimal 10 menit, upload YouTube Unlisted, menguji link, dan mengumpulkan link saja di Moodle Session 12 sebelum 7 November 2026 pukul 24.00 WIB. Lima unsur wajib dan susunan 9:30 tersedia pada PDF.

## Petunjuk sesi berikutnya

Pull versi Git terbaru; baca PROGRESS.md, test-results.md dan requirements-traceability.md. Pertahankan perubahan teman, jangan membuat ulang proyek atau seed database bersama. Untuk fixture PDF bersih gunakan project uji terisolasi. Simpan kredensial hanya pada file lokal yang diabaikan Git; jangan memasukkan key administrator ke server aplikasi, PDF atau video.


## Navigasi atas dan Demo Login Accounts — 7 November 2026

- Sidebar dihapus dari shell; satu Apps switcher pada topbar menampilkan menu sesuai role. Area kerja memakai lebar penuh. Breadcrumb, nama, role dan Logout tetap tersedia. Mobile menggunakan menu yang sama, bukan daftar izin terpisah.
- CRM default List, Kanban tetap tersedia. Ringkasan Leads, Open Opportunities, Expected Revenue (tanpa Lost), dan Weighted Revenue peluang terbuka menampilkan nilai dari data aktual. Angka tidak meniru nominal pada foto referensi.
- Halaman /login menampilkan enam kartu role + nama tokoh PDF. Pilih kartu untuk autentikasi Supabase nyata dengan QA account yang sudah ada; profil/id diperiksa setelah sign-in. Tidak membuat akun baru, mengubah password, role, RLS, migrasi, atau transaksi usaha.
- Shortcut hanya development dengan hostname loopback, origin sama untuk action, dan file .env.role-accounts.local yang cocok dengan proyek. Password dibaca hanya di server; tidak dimasukkan ke HTML/props/bundle klien. Production menonaktifkan shortcut dan tetap meminta login biasa. Ini akun uji pada database bersama, bukan simulasi localStorage.
- Uji HTTP native-form Server Actions: keenam role masuk dan identitas benar; enam kartu tampil; password tidak ada dalam HTML; Host eksternal tidak menampilkan shortcut. Production build tidak menampilkan shortcut; /pos anonim tetap redirect login. Bukti: quick-login-results.json. npm run test:quick-login dapat mengulang pengujian di preview development 3000 tanpa transaksi usaha.
- Typecheck, lint, role-policy dan production build lulus. Pemeriksaan visual otomatis belum dapat diselesaikan: Browser Use tidak tersedia, dan Windows Computer Use menghentikan akses karena tidak dapat memverifikasi URL browser. Jangan menganggap seluruh viewport/state sudah diperiksa visual.
- Preview aktif pada http://127.0.0.1:3000/login. Akun lengkap tersedia hanya di laptop yang memiliki file lokal akun uji tersebut; file kredensial tidak ikut Git. Pada laptop lain siapkan file akun secara privat atau gunakan login biasa.


## Dokumen dapat dibuka dan menjalankan aksi — 7 November 2026

- Memperbaiki daftar teks pasif: nomor SO/PO/Delivery/Receipt/Bill/Payment/Credit Note/Transfer/Journal/Hold/Session, Product dan Contact kini memiliki detail berotorisasi. List dan Kanban CRM membuka Opportunity. Accounting KPI menuju Reporting; jurnal dan Audit menuju sumber yang sesuai.
- Detail memakai baris nyata, kuantitas sumber, status, smart buttons, hubungan dokumen dan History Owner. Form tindakan dipasang berdasarkan role/status/sisa kuantitas/tagihan; bukan tombol hias. Detail terposting tetap terkunci. Cashier hanya melihat history Hold/Receipt sendiri pada daftar, dengan detail Session/Hold milik sendiri diperiksa di server; tidak ada klaim RLS baru.
- Customer exposure/terms tampil; C02 NET7, limit 300000 dan exposure 220000 diverifikasi. URL nomor bergaris miring diperbaiki. Opening AR/AP dapat dibuka; vendor payment tidak salah menuju customer invoice.
- 192 pemeriksaan detail/link/role lulus, 0 gagal, 2 jenis tanpa record aktual ditandai NOT_TESTED. Penolakan Lost tanpa alasan dan overpayment melalui form detail lulus tanpa perubahan data. Lihat document-details-results.json, document-actions-results.json dan interaction-audit.md.
- Verifier Sales/Purchase, Cashier dan Hold tetap PASS setelah perubahan. Tidak menjalankan migrasi, seed/reset, atau posting sukses baru. Seluruh PDF/T-01–T-36 belum lengkap; gap terperinci tetap dicatat.
