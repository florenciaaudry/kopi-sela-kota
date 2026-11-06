# Role dan bukti pengujian

## Matriks akses

| Role | Halaman utama yang diizinkan | Aksi dominan |
|---|---|---|
| Sales | Sales, CRM | Peluang, tahap CRM, pesanan pelanggan |
| Warehouse | Sales, Purchase, Inventory, Retur | Delivery, receipt, transfer; referensi pengiriman untuk pemeriksaan retur |
| Procurement | Purchase, Inventory | Pesanan pembelian; baca stok |
| Finance | Accounting, Invoicing, Retur | Invoice/Bill, pembayaran, posting Credit Note |
| Cashier | POS, detail struk | Sesi, penjualan/hold/tender, struk, permintaan penutupan |
| Owner | Seluruh tujuh aplikasi dan kemampuan terkait | Aksi operasional serta persetujuan selisih kas |

Jurnal/akun hanya Finance dan Owner. Biaya standar hanya Warehouse, Procurement, Finance, Owner. Semua role ditolak mengubah profil langsung melalui Data API; tidak ada pendaftaran publik pada UI. Filter menu bukan pengganti validasi server dan RLS.

Warehouse tidak mem-posting Credit Note atau membaca saldo invoice pada layar retur. Tahap inspeksi retur terpisah belum lengkap; layar Warehouse menampilkan referensi delivery dan memberi penjelasan yang jujur. Finance/Owner mem-posting Credit Note. Migrasi 006 memperketat guard RPC yang sebelumnya masih memperbolehkan Sales. Jangan menyebutnya sudah diterapkan sebelum ada hasil database.

## Snapshot awal 6 November 2026 (historis; digantikan hasil di bawah)

- Query langsung pada Supabase mengembalikan hanya `owner: profile_count=1, auth_user_count=1, confirmed_count=1`.
- Login Owner pernah terverifikasi historis. Lima role lain belum dapat diuji login karena akun/profil belum dibuat.
- `test:role-policy` memeriksa konsistensi kode; bukan bukti sesi nyata.
- `test:roles` menguji login password Auth, profil, akses delapan URL aplikasi melalui cookie SSR, RLS jurnal/akun/biaya, larangan UPDATE profil langsung, dan logout. Tidak mem-posting transaksi usaha.
- Tes API/SSR bukan pengganti uji klik seluruh workflow atau seluruh T-01–T-36.

## Menyiapkan enam akun uji sekali jalan

1. Pastikan terminal berada di folder proyek dan aplikasi lokal berjalan.
2. Jalankan `npm run roles:setup`.
3. Isi secret/service-role key hanya pada file lokal yang diabaikan Git, `.env.role-admin.local`, sebagai `SUPABASE_SECRET_KEY=...`. Script saat ini tidak memakai prompt tersembunyi. Publishable key tidak dapat membuat akun admin. Jangan kirim key ke chat atau video.
4. Script membuat enam akun `qa-<role>@kopiselakota.test`, mengonfirmasi email uji lewat Admin API, dan mengisi profil masing-masing. Password acak disimpan hanya di `.env.role-accounts.local`, yang diabaikan Git. Akun Owner asli tidak diubah. Akun uji adalah akun tambahan, bukan identitas anggota kelompok.
5. Script tidak mengganti password akun yang sudah ada. Jika menemukan email yang tidak cocok dengan metadata akun uji dan catatan lokal, script berhenti agar tidak mengambil alih akun lain.
6. Jalankan `npm run test:roles`. Hasil aktual tersimpan di `docs/role-test-results.json` tanpa password/token. Role yang gagal login tidak dianggap lulus.
7. Jangan menaruh key admin pada variabel `NEXT_PUBLIC_*`. Jangan commit file akun lokal atau membagikan kredensial admin. File password akun uji hanya dibuka secara lokal bila perlu login manual.

Jika script berhenti sebelum semua akun dibuat, jalankan kembali dengan file akun lokal yang sama. Catatan password disimpan setelah setiap akun dibuat; jangan menghapusnya karena script tidak mereset password akun yang sudah ada.

## Koreksi database

Migrasi tambahan: `supabase/migrations/202611060006_credit_note_role_boundary.sql`.
Hanya memperketat posting Credit Note menjadi Finance/Owner; tidak mengubah transaksi, saldo, atau seed. Eksekusi pertama ditolak approval review. Setelah pengguna secara eksplisit menyetujui migrasi 006 untuk proyek tswkkutgqayvxwzepqfs, migrasi berhasil dijalankan. Query pasca-migrasi mengembalikan finance_owner_guard=true dan current_profiles=1. Jangan menjalankan setup/seed atau bundle lama untuk menerapkan migrasi ini.

### Cara input key yang diperbaiki

Prompt tersembunyi dihapus karena membingungkan pada terminal pengguna. Sekarang isi `.env.role-admin.local` dengan satu baris `SUPABASE_SECRET_KEY=...`, simpan, lalu jalankan `npm.cmd run roles:complete`. File tersebut diabaikan Git. Metode ini menyimpan key admin di file lokal (berbeda dari prompt lama); hapus file admin setelah pembuatan akun berhasil. Jangan kirim isinya ke chat atau tampilkan pada video. File akun uji `.env.role-accounts.local` berbeda dan diperlukan untuk tes login berikutnya.

## Hasil login dan akses role aktual — 6 November 2026

- Akun uji keenam role berhasil dibuat pengguna lewat roles:complete; Owner asli tidak diubah.
- Laporan awal 82 PASS/20 FAIL mengandung false positive parser: string not-found ikut pada template script di halaman yang sah. Diperbaiki dengan pemeriksaan HTML h1 aktual, error data, dan digest penolakan 403/404; regression test lulus.
- Satu pengulangan mengalami timeout Owner dan pengulangan lain timeout Procurement/Inventory. Histori disimpan terpisah; retry hanya untuk exception jaringan, bukan hasil izin yang salah.
- Eksekusi akhir: 114 PASS, 0 FAIL. Login/profil keenam role, 48 akses URL, RLS jurnal/akun/biaya, larangan mengubah profil/biaya langsung, larangan insert jurnal langsung, RPC lintas-role, logout dan redirect diperiksa nyata.
- Laporan utama: docs/role-test-results.json. Histori: role-test-results-before-parser-fix.json, role-test-results-owner-transient.json, role-test-results-network-timeout.json. Tidak ada password/token pada laporan.
- Tidak mem-posting transaksi bisnis. Cakupan ini tidak membuktikan semua workflow transaksi, tombol UI, atau T-01–T-36.
