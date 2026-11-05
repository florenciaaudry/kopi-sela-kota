# Arsitektur dan model data

## Teknologi sasaran

- Next.js App Router dan TypeScript strict untuk web.
- Tailwind CSS untuk tampilan.
- Supabase Auth dan PostgreSQL untuk sesi, persistensi, RLS, constraint, dan transaksi.
- Vercel sebagai target deployment.
- Seluruh perhitungan uang memakai Rupiah integer/NUMERIC, PBJT 10% setelah diskon, pembulatan half-up per baris. Waktu bisnis ditampilkan WIB.

UI login, shell peran, dan Inventory terhubung-query database telah dibuat. Jika Supabase belum dikonfigurasi pada development, aplikasi membuka mode demo eksplisit dengan fixture di localStorage. Mode demo hanya untuk mencoba layar dan logika dasar: tidak mengautentikasi user dan tidak mengirim transaksi ke Supabase. Modul transaksi produksi belum terhubung.

## Batas data

- **Akses**: `profiles` terhubung ke `auth.users`; peran aplikasi Sales, Warehouse, Procurement, Finance, Cashier, dan Owner ditentukan di server/database.
- **Master**: pelanggan, pemasok, SKU/ukuran, biaya standar terpisah dengan RLS, daftar harga pemasok, lokasi, termin pembayaran, pajak, dan akun.
- **Penjualan**: lead/opportunity → quotation/Sales Order → reservasi/delivery → customer invoice → payment.
- **Pengadaan**: RFQ/Purchase Order → receipt (datang, accepted, rejected) → vendor bill → payment.
- **Persediaan**: saldo per SKU/lokasi; ketersediaan berasal dari On Hand dikurangi reservasi aktif; transfer memiliki sumber dan tujuan.
- **Keuangan**: journal entry/line, debit/kredit seimbang, relasi dokumen sumber, saldo pembuka, dan pembalikan.
- **POS**: konfigurasi, sesi, order/hold, reservasi berwaktu, tender, receipt, dan penutupan kas.
- **Kontrol bersama**: persetujuan diskon/selisih, audit event, idempotency key, serta tautan dokumen asal/lanjutan.

Migrasi pondasi saat ini menerapkan RLS dan akses baca per role. Perubahan data dari browser sengaja ditolak sampai fungsi transaksi/RPC yang memeriksa role, stok/kredit, idempotency, serta menulis audit dalam transaksi yang sama tersedia. Tidak ada service-role key di client.

Skrip `npm run supabase:prepare` membentuk `supabase/setup.sql` dari file migrasi dan seed sumber, serta menyimpan Project URL/publishable key lokal ke `.env.local`. Bundle ini hanya untuk sekali eksekusi pada project development kosong; tidak menggantikan pemeriksaan database.

## Baseline yang harus direkonsiliasi

- Operasional: 20 Oktober 2026 pukul 09.00 WIB.
- 15 SKU di dua lokasi; total 480 unit dan nilai standar Rp4.290.000.
- CBW-250: WH-TBT 40 On Hand/10 Reserved/30 Available; CAFE-TBT 20/0/20.
- Piutang C02 Rp220.000; utang V02 Rp300.000; Bank Rp10.000.000; Kas Rp500.000.
- Kas awal POS Rp100.000 adalah bagian dari Kas perusahaan, bukan saldo tambahan.
- Jurnal pembuka: debit Kas Rp500.000, Bank Rp10.000.000, Piutang Rp220.000, Persediaan Rp4.290.000; kredit Utang Rp300.000 dan Modal Rp14.710.000. Debit = kredit Rp15.010.000.
- L00001 dan S00001 serta PO00001 adalah dokumen awal yang belum mem-posting jurnal. OPEN-AR-C02 dan OPEN-AP-V02 menjelaskan bagian saldo pembuka, bukan transaksi yang boleh diposting ulang.

## Transaksi yang wajib atomik

Konfirmasi SO dan reservasi; validasi delivery/receipt dan journal; posting invoice/bill dan update saldo; payment allocation; finalisasi POS (tender penuh, receipt, stock move, journal); retur/credit note; dan penutupan sesi. Setiap aksi sensitif memeriksa role di server/database, status terkunci, ketersediaan, limit, serta idempotency key dalam transaksi yang sama.
