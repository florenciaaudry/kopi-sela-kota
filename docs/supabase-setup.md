# Supabase setup checklist

Lakukan ini hanya pada project development Supabase baru. Jangan jalankan setup bundle pada database produksi atau database yang sudah berisi data.

1. **Buat project Supabase** melalui dashboard dan tunggu sampai database siap. Dari Project Settings → API, siapkan Project URL dan publishable key (atau legacy anon key).
2. Dari folder proyek, jalankan `npm run supabase:prepare`. Masukkan URL dan key saat diminta. Script menulis Project URL ke `NEXT_PUBLIC_SUPABASE_URL` dan publishable/anon key ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`—nama key yang dipakai helper Supabase proyek ini—di `.env.local` lokal (tidak di-commit). Script menghasilkan [`supabase/setup.sql`](../supabase/setup.sql) untuk project baru dan [`supabase/apply-transactions.sql`](../supabase/apply-transactions.sql) sebagai bundle incremental berisi migrasi 002–009; 007 berupa catatan retired/no-op.
3. **Project baru yang kosong:** buka SQL Editor, tinjau seluruh isi `supabase/setup.sql`, lalu jalankan sekali pada project development baru. Jangan gunakan setup bundle pada database yang sudah berisi data.
   **Project bersama Kopi Sela Kota:** setup/seed dan migrasi 002–006, 008–009 telah diterapkan atau dikonfirmasi; migrasi 007 sudah retired dan tidak mengubah data historis. Jangan jalankan setup, seed, apply-transactions, atau migrasi tersebut lagi. Data project bersama bukan baseline seed.
   **Project lain yang sudah terpasang sebagian:** jangan menjalankan bundle penuh. Pastikan migrasi mana yang sudah diterapkan terlebih dahulu, lalu tinjau dan jalankan hanya migrasi yang memang belum diterapkan sesuai urutan dan persetujuan pemilik project.
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

Key yang ditulis oleh script adalah publishable/anon key, yang memang dipakai browser bersama RLS. Jangan masukkan `service_role`/secret key ke `.env.local`, browser, chat, atau repositori. Setup bundle menjalankan DDL yang tidak idempotent; bila gagal di tengah, tinjau error sebelum menjalankan ulang dan gunakan project development baru bila diperlukan. Bundle incremental dibangun ulang dari seluruh migrasi setelah foundation, sehingga bukan file patch untuk database yang sudah terpasang sebagian. Jalankan hanya pada project baru/yang status migrasinya telah dipastikan cocok.

## Pemeriksaan sebelum menandai integrasi selesai

- Login dan logout masing-masing role.
- Pastikan role tanpa profil ditolak.
- Jalankan T-01–T-36 terhadap database fixture dan verifikasi saldo/jurnal setelah operasi ditolak maupun diterima.
- Pastikan URL/key aktif hanya ada di `.env.local`, tidak dalam commit.

Jika Project URL/key sama sekali belum dikonfigurasi, aplikasi lokal berjalan pada **mode demo** berlabel: alur UI disimulasikan secara lokal, bukan Supabase atau buku besar resmi. Jika Supabase sudah dikonfigurasi tetapi terjadi error, aplikasi tidak boleh diam-diam beralih ke mode demo.

## Laptop baru untuk database yang sudah ada

Jika project Supabase bersama sudah disiapkan, jangan jalankan `setup.sql`, `seed.sql`, atau `apply-transactions.sql` lagi. Clone repository, jalankan `npm ci`, buat `.env.local` dari `.env.example`, isi URL dan publishable/anon key, lalu jalankan `npm run dev` dan login dengan user yang sudah ada. Detail langkah dan hasil verifikasi tersedia di [panduan handoff](./handoff.md).
