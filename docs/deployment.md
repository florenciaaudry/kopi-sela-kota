# Deployment publik

Status 18 November 2026: **deployment Production berhasil** di https://kopi-sela-kota.vercel.app dari branch `main`, commit awal publik `947b475`. Login Owner melalui browser berhasil. Suite Auth/HTTP/RLS enam role pada URL publik: **180 PASS / 0 FAIL**, tanpa posting transaksi bisnis. Bukti: [hasil pengujian publik](public-role-test-results.json). Ini bukan klaim seluruh T-01–T-36 lulus browser atau siap produksi.

Production menggunakan Supabase bersama; QA terpisah memakai proyek `kopi-sela-kota-qa`. Reset baseline hanya di QA. Tiga variabel Production sudah dikonfigurasi: dua konfigurasi publik Supabase dan key admin **server-only** yang disetujui pemilik untuk New User. Nilai rahasia tidak dicantumkan di dokumentasi/Git.

## Jalur Vercel melalui GitHub

Vercel dapat mengimpor repository Git dan memakai branch untuk deployment berikutnya. Ikuti [panduan Git resmi](https://vercel.com/docs/git). Pendaftaran akun, login GitHub dan pemberian akses repository dilakukan pemilik akun.

1. Buat/login akun Vercel memakai GitHub, lalu Import repository https://github.com/florenciaaudry/kopi-sela-kota pada branch main.
2. Framework Preset: Next.js. Root Directory: `./`. Build Command: `npm run build`. Biarkan Output Directory otomatis; ini aplikasi SSR/Server Actions, bukan static export. Build produksi standar memakai `.next`; preview lokal `.next-preview` tetap terpisah.
3. Isi Environment Variables untuk Production sebelum Deploy:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL proyek Supabase yang sama dengan laptop kelompok.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable/anon key proyek tersebut, sesuai nama variabel kode.
4. Jangan upload file `.env`, file akun QA, atau file admin lokal ke Git. Salin nilai konfigurasi yang diperlukan langsung melalui pengaturan hosting. Setelah mengubah environment variable, lakukan redeploy sebagaimana [dokumentasi environment Vercel](https://vercel.com/docs/environment-variables).
5. Jika New User harus aktif di hosting, administrator dapat mengisi **server-only** `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`. Jangan memberi prefix NEXT_PUBLIC. Tanpa key admin, login dan perubahan Role pengguna yang sudah ada tetap bekerja; Create User dinonaktifkan. [Supabase mensyaratkan admin createUser hanya di server](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
6. Deploy lalu berikan URL hasilnya untuk verifikasi. Tidak perlu menjalankan seed atau migrasi lagi: skema 019–021 sudah diterapkan pada proyek Supabase bersama.

## Pemeriksaan sesudah URL tersedia

- Buka `/login` tanpa akun: tidak ada MODE DEMO atau tombol login cepat lokal. Login manual enam role memakai akun yang telah disiapkan; jangan tampilkan password pada video.
- URL internal tanpa sesi diarahkan ke login. Role yang tidak berhak tetap ditolak, termasuk akses URL langsung dan RPC.
- Periksa Dashboard, Quotation/RFQ multi-line, Source Documents, Save/Discard, dan logout. Periksa satu alur terkontrol yang disepakati sebelum membuat transaksi persisten di database bersama.
- Periksa History dan RLS; pastikan tidak ada key admin/password dalam HTML atau Git.
- Pastikan link dapat dibuka dari browser/perangkat lain. Build lokal yang lulus bukan bukti URL publik sudah aktif.

Jangan mematikan RLS, menghapus histori, atau menjalankan seed ulang untuk mengatasi masalah deployment.
