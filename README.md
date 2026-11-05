# ERP Coffee Shop — Kopi Sela Kota

Pondasi aplikasi ERP pembelajaran untuk Sales/CRM, Purchase/Inventory, Accounting/Invoicing, dan Point of Sale. Spesifikasi utama adalah PDF tugas yang diberikan.

## Status

Aplikasi Next.js terhubung ke Supabase Auth dan PostgreSQL. Dashboard Owner serta satu alur Sales dan Purchase sampai pembayaran sudah diverifikasi terhadap database bersama; efek stok dan jurnal dicatat di [hasil pengujian](./docs/test-results.md). Aplikasi **belum dinyatakan lengkap**: T-01–T-36 belum seluruhnya diuji dan sejumlah fitur masih memiliki gap. Lihat [progres](./docs/PROGRESS.md) dan [panduan handoff](./docs/handoff.md).

## Stack sasaran

- Next.js App Router + TypeScript strict
- Tailwind CSS
- Supabase Auth + PostgreSQL/RLS
- npm; deployment Vercel

## Menjalankan aplikasi di laptop baru

Gunakan Node.js `>=20.9` dan npm. Clone branch `main`, jalankan `npm ci`, salin `.env.example` menjadi `.env.local`, lalu isi Project URL dan publishable/anon key. Sesudah itu jalankan `npm run dev` dan buka `http://localhost:3000/login`. Panduan langkah demi langkah, termasuk peringatan agar tidak menjalankan ulang seed pada database bersama, ada di [docs/handoff.md](./docs/handoff.md).

Mode demo hanya untuk lingkungan lokal tanpa konfigurasi Supabase dan selalu diberi label. Jika Supabase telah dikonfigurasi, error database tidak dialihkan diam-diam ke demo.

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
- [Panduan handoff dan laptop baru](./docs/handoff.md)
- [Role Assignment Sheet (draft)](./docs/role-assignment.md)
- [Team Agreement (draft)](./docs/team-agreement.md)

## Seed safety

`supabase/seed.sql` memuat nama dan saldo fiktif dari dataset tugas. Jalankan hanya pada database development/test baru. Jangan gunakan untuk menghapus atau menimpa data produksi.

### Catatan runtime terbaru

Script dev/build menggunakan Webpack untuk menghindari crash child-process Turbopack pada mesin pengembangan saat ini. Cache preview berada di `.next-preview`. Build verifikasi terpisah dapat dijalankan pada PowerShell dengan `$env:ERP_VERIFY_BUILD="1"` lalu `npm run build`; hasilnya berada di `.next-check`. Hapus variabel tersebut dari sesi terminal (`Remove-Item Env:ERP_VERIFY_BUILD`) sebelum kembali menjalankan preview normal. Jangan jalankan build default bersamaan dengan dev pada folder output yang sama.

Validasi keranjang: `npm run test:pos-cart`. Halaman CRM memiliki Kanban, dan nomor struk pada POS membuka detail yang bisa dicetak melalui browser. Pengujian transaksi live penuh masih harus mengikuti fixture terisolasi dalam PDF.
