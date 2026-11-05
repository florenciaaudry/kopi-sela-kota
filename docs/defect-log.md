# Defect Log

Defect UI/routing yang ditemukan saat smoke check dicatat di bawah. Ini bukan pernyataan bahwa aplikasi bebas defect; T-01–T-36 dan integrasi database belum diuji.

| ID | Severity | Pengujian/area | Reproduksi | Dampak | Status | Bukti |
|---|---|---|---|---|---|---|
| DEF-001 | High | Routing dashboard | Buka `/`; scaffold `src/app/page.tsx` selalu mengalihkan ke `/login`, sehingga dashboard di route group tidak tampil. | Workspace tidak dapat dibuka tanpa Supabase walaupun dashboard demo tersedia. | Resolved: hapus scaffold redirect; route group kini menjadi halaman root. | Browser smoke check `/` menampilkan Ringkasan operasional dan banner demo. |
