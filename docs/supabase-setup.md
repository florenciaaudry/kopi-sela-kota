# Supabase setup checklist

Lakukan ini hanya pada project development Supabase baru. Jangan jalankan setup bundle pada database produksi atau database yang sudah berisi data.

1. **Buat project Supabase** melalui dashboard dan tunggu sampai database siap. Dari Project Settings → API, siapkan Project URL dan publishable key (atau legacy anon key).
2. Dari folder proyek, jalankan `npm run supabase:prepare`. Masukkan URL dan key saat diminta. Script menulis Project URL ke `NEXT_PUBLIC_SUPABASE_URL` dan publishable/anon key ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`—nama key yang dipakai helper Supabase proyek ini—di `.env.local` lokal (tidak di-commit). Script menghasilkan [`supabase/setup.sql`](../supabase/setup.sql) untuk project baru dan [`supabase/apply-transactions.sql`](../supabase/apply-transactions.sql) berisi migrasi incremental terurut 002–005.
3. **Project baru:** buka SQL Editor, tempel seluruh isi `supabase/setup.sql`, lalu jalankan sekali. **Project bersama yang sudah menjalankan setup/seed dan migrasi 002–003:** jangan jalankan setup/seed atau bundle apply-transactions lagi. Jika belum diterapkan pada project lain, jalankan migrasi 004 lalu 005 secara berurutan. Migrasi 004 membatasi durasi hold baru; migrasi 005 menambah relasi pelanggan pada struk POS langsung lunas. Untuk project bersama Kopi Sela Kota, pengguna mengonfirmasi kedua migrasi tersebut sudah berhasil diterapkan; jangan jalankan ulang.
4. Di Authentication → Users, buat user pertama. Catat email dan nama, lalu jalankan di SQL Editor dengan email/nama diganti:

   ```sql
   insert into public.profiles (id, full_name, role)
   select id, 'Nama Owner', 'owner'::public.app_role
   from auth.users
   where lower(email) = lower('email-owner@contoh.id')
   on conflict (id) do update
   set full_name = excluded.full_name, role = excluded.role;
   ```

   Jika hasil query tidak menambah/memperbarui satu baris, pastikan user Auth dengan email tersebut sudah dibuat. Buat role enam pengguna sesuai kolom `role` yang tersedia: `sales`, `warehouse`, `procurement`, `finance`, `cashier`, `owner`.
5. Restart server `npm run dev`, buka `http://127.0.0.1:3000/login`, lalu masuk menggunakan akun Auth yang dibuat. Masukkan password langsung di form browser, bukan melalui chat. Login hanya dianggap aktif setelah sesi terautentikasi dan profil role terbaca.

Key yang ditulis oleh script adalah publishable/anon key, yang memang dipakai browser bersama RLS. Jangan masukkan `service_role` key ke `.env.local`, browser, chat, atau repositori. Setup bundle menjalankan DDL yang tidak idempotent; bila gagal di tengah, tinjau error sebelum menjalankan ulang dan gunakan project development baru bila diperlukan. Bundle incremental memakai transaksi SQL dan mengulang semua migrasi setelah foundation. Jalankan hanya pada project yang belum menerapkan satupun migrasi yang terdaftar; untuk DB bersama yang telah menerapkan 002–003, jangan jalankan bundle tersebut.

## Pemeriksaan sebelum menandai integrasi selesai

- Login dan logout masing-masing role.
- Pastikan role tanpa profil ditolak.
- Jalankan T-01–T-36 terhadap database fixture dan verifikasi saldo/jurnal setelah operasi ditolak maupun diterima.
- Pastikan URL/key aktif hanya ada di `.env.local`, tidak dalam commit.

Sebelum project tersedia, aplikasi lokal berjalan pada **mode demo**: alur UI dan aturan dasar disimulasikan di localStorage browser, bukan Supabase atau buku besar resmi.

## Laptop baru untuk database yang sudah ada

Jika project Supabase bersama sudah disiapkan, jangan jalankan `setup.sql`, `seed.sql`, atau `apply-transactions.sql` lagi. Clone repository, jalankan `npm ci`, buat `.env.local` dari `.env.example`, isi URL dan publishable/anon key, lalu jalankan `npm run dev` dan login dengan user yang sudah ada. Detail langkah dan hasil verifikasi tersedia di [panduan handoff](./handoff.md).
