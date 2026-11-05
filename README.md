# ERP Coffee Shop — Kopi Sela Kota

Pondasi aplikasi ERP pembelajaran untuk Sales/CRM, Purchase/Inventory, Accounting/Invoicing, dan Point of Sale. Spesifikasi utama adalah PDF tugas yang diberikan.

## Status

Pondasi Next.js, login Supabase, shell peran, Inventory database, dan tampilan/logika simulasi lokal untuk modul ERP sudah dibuat. Demo bukan transaksi database. RPC production, alur transaksi terhubung Supabase, akun uji, dan deployment belum tersedia. Baca [docs/PROGRESS.md](./docs/PROGRESS.md) untuk status rinci.

## Stack sasaran

- Next.js App Router + TypeScript strict
- Tailwind CSS
- Supabase Auth + PostgreSQL/RLS
- npm; deployment Vercel

## Menjalankan aplikasi

Prasyarat: Node.js LTS/npm. Tanpa kredensial Supabase, server development akan menampilkan **mode demo lokal** dengan data fixture yang disimpan di localStorage browser; ini bukan integrasi database.

Untuk setup Supabase satu kali, ikuti checklist di [docs/supabase-setup.md](./docs/supabase-setup.md). Setelah membuat project, jalankan `npm run supabase:prepare`, jalankan berkas gabungan `supabase/setup.sql` sekali lewat SQL Editor, lalu buat user Auth dan profil role.

Jalankan `npm run dev` untuk membuka workspace. Jika Supabase belum dikonfigurasi, semua modul yang sudah tersedia dapat dicoba melalui mode demo yang selalu diberi label; data demo tidak mengaktifkan autentikasi dan tidak dianggap transaksi resmi. Setelah Supabase dikonfigurasi, mode demo lokal dinonaktifkan dan route modul yang belum terhubung ke database akan menampilkan statusnya secara eksplisit.

## Environment

Lihat [.env.example](./.env.example). Aplikasi hanya memerlukan Project URL dan publishable/anon key; akses data dibatasi oleh RLS. Jangan gunakan service-role key di aplikasi.

## Dokumentasi

- [Architecture](./docs/architecture.md)
- [Decision Log](./docs/decision-log.md)
- [Requirements traceability](./docs/requirements-traceability.md)
- [Dataset mapping](./docs/dataset-mapping.md)
- [Test Results](./docs/test-results.md)
- [Defect Log](./docs/defect-log.md)
- [AI disclosure (draft)](./docs/ai-disclosure.md)
- [Progress](./docs/PROGRESS.md)
- [Supabase setup checklist](./docs/supabase-setup.md)
- [Role Assignment Sheet (draft)](./docs/role-assignment.md)
- [Team Agreement (draft)](./docs/team-agreement.md)

## Seed safety

`supabase/seed.sql` memuat nama dan saldo fiktif dari dataset tugas. Jalankan hanya pada database development/test baru. Jangan gunakan untuk menghapus atau menimpa data produksi.
