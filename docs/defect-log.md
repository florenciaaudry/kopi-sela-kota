# Defect Log

Defect UI/routing dan perilaku transaksi yang ditemukan saat verifikasi dicatat di bawah. Ini bukan pernyataan bahwa aplikasi bebas defect; T-01–T-36 belum seluruhnya diuji.

| ID | Severity | Pengujian/area | Reproduksi | Dampak | Status | Bukti |
|---|---|---|---|---|---|---|
| DEF-001 | High | Routing dashboard | Buka `/`; scaffold `src/app/page.tsx` selalu mengalihkan ke `/login`, sehingga dashboard di route group tidak tampil. | Workspace tidak dapat dibuka tanpa Supabase walaupun dashboard demo tersedia. | Resolved: hapus scaffold redirect; route group kini menjadi halaman root. | Browser smoke check `/` menampilkan Ringkasan operasional dan banner demo. |
| DEF-002 | Medium | Sales / pelanggan COD | Buat Sales Order C06 (Pelanggan Tunai, limit Rp0) untuk 1 CBW-250. RPC menolak dengan eksposur Rp33.000 > limit Rp0. | Pelanggan COD tidak dapat memakai alur Sales → Invoice → Payment; arah POS sebagai jalur tunai belum diverifikasi live. | Open; validasi limit kredit bekerja sesuai nilai limit, tetapi kebutuhan jalur COD harus dipastikan terhadap spesifikasi. | Penolakan RPC aktual tanpa Sales Order baru pada 5 Nov 2026. |
