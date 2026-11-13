# Pemeriksaan browser ERP — 13 November 2026

**Kesimpulan: cakupan visual/interaksi bertambah, tetapi kedua kekurangan yang ditanyakan belum boleh dianggap selesai seluruhnya.** Ada 42 pasangan bukti PNG dan DOM dari aplikasi lokal yang terhubung ke Supabase bersama. Jumlah ini adalah kondisi layar yang diperiksa, bukan 42 skenario PDF atau sertifikasi seluruh kemungkinan interaksi.

## Perbaikan dan verifikasi

1. Reporting: referensi Credit Note kini memakai pemetaan dokumen dan pemeriksaan role yang sama dengan tautan lain. CN00002 dapat dibuka dan Back kembali ke Reporting.
2. Returns: tautan Return Inspections yang berulang dihapus. Pemeriksaan browser setelah perubahan menemukan tepat satu tautan.
3. Users & Permissions: warna label role diperjelas tanpa mengubah warna label di topbar. Hasil diperiksa kembali secara visual.
4. Tes compact UI: pemeriksaan Back sebelumnya bergantung pada urutan atribut HTML. Tes diperbaiki agar memeriksa class dan tujuan tautan secara terpisah; ini kesalahan tes, bukan alasan untuk mengubah tujuan Back yang sudah benar.

## Bukti interaksi langsung

- Sales: pencarian, membuka SO, membuka Customer dari SO dan konteks kembali; Quotation dua produk, perhitungan PBJT, jumlah nol ditolak, konfirmasi meninggalkan perubahan dan Cancel mempertahankan isian, Discard tidak menyimpan draft.
- CRM: perpindahan List/Kanban dan tahap pipeline.
- Purchase: RFQ00004 dua produk disimpan senilai Rp520.000, Log Note tersimpan, lalu draft dibatalkan. Tidak dikonfirmasi menjadi PO. Dokumen dan audit tetap ada.
- POS: formulir Order dan Hold dibuka; tambah/hapus baris dan pratinjau Rp72.600 diperiksa; formulir dibatalkan tanpa posting. Struk historis POSR00022 dibaca, termasuk Cash/Bank masing-masing Rp3.300 dan PBJT Rp600.
- Receipt: 21 unit untuk PO00001 yang tersisa 20 ditolak; kuantitas PO tidak berubah.
- Return Inspection: 11 unit saat batas 10 ditolak; tidak menambah inspeksi/return move.
- Payment: Rp220.001 untuk OPEN-AR-C02 yang masih terutang Rp220.000 ditolak; Amount Due tetap Rp220.000.
- Reporting: filter periode 7 November diterapkan; penelusuran Credit Note, Invoice, PO, Receipt, Vendor Bill, Vendor Payment, dan Journal menggunakan data historis.
- Audit Log: filter RFQ00004 menampilkan create, Log Note, dan pembatalan.
- Login browser Owner dan Cashier berhasil. Cashier hanya melihat satu aplikasi POS; membuka /accounting langsung menghasilkan layar akses ditolak tanpa data jurnal.

Tidak ada seed, reset, migrasi, pembayaran baru, atau posting stok/jurnal dari audit browser ini. Satu draft RFQ beserta Log Note dan pembatalannya tetap tersimpan. Saldo yang terlihat: AR Rp549.670, AP Rp300.000, Cash Rp580.300, Bank Rp10.107.130, stok 456 unit, Inventory Value Rp4.086.000. Ini data berjalan, bukan baseline PDF.

## Cakupan layar PDF

| Layar | Bukti | Batas pemeriksaan |
|---|---|---|
| S-01 Dashboard/app switcher | 06, 40–42 | Owner/Cashier browser; role lain diuji Auth/HTTP terpisah |
| S-02 Customer | 03, 24 | Detail/konteks dilihat; edit master tidak diulang |
| S-03 Product | 12, 32 | Harga/biaya/varian dibaca; CRUD tidak diulang |
| S-04 CRM | 07–08 | List/Kanban; seluruh transisi belum diulang |
| S-05 Quotation/SO | 01–05 | Preview/validasi/Discard; konfirmasi approval belum diulang browser |
| S-06 Delivery/Backorder | 02 | Relasi dua Delivery dilihat; form dan seluruh kondisi Backorder belum diperiksa lengkap |
| S-07 Inventory/Transfer | 12, 31–32 | Form transfer dibuka/dibatalkan; posting transfer belum dilakukan |
| S-08 RFQ/PO | 09–11, 35 | Draft dua baris save/cancel; konfirmasi PO tidak diulang |
| S-09 Receipt | 27–28, 36 | Form, penolakan berlebih, detail historis |
| S-10 Customer Invoice | 14, 29–30 | Detail/penolakan payment; posting Invoice baru tidak diulang |
| S-11 Vendor Bill | 33 | Dokumen lunas dan relasi dibaca; three-way match baru tidak diulang |
| S-12 Register Payment | 29–30 | Penolakan overpayment; partial payment baru tidak diulang |
| S-13 Journal/GL | 13, 34, 37 | Detail jurnal dan sumber; seluruh rekonsiliasi fixture tidak diulang browser |
| S-14 POS Session | 15 | Daftar dibaca; open/close/variance approval belum diulang browser |
| S-15 Hold | 17 | Form/add/remove/cancel; expiry waktu nyata belum diperiksa lengkap |
| S-16 Tender/Receipt | 16, 39 | Form dan struk historis; pembayaran baru/print preview belum diulang |
| S-17 Return/Credit Note | 18, 20, 25–26 | Penolakan berlebih dan relasi; seluruh variasi sealed/damaged belum diulang |
| S-18 Reporting/Audit | 19–20, 23, 38 | Filter dan penelusuran sumber; F-21 ekspor opsional tetap ditunda |

Users & Permissions/New User juga dilihat (21–22); pembuatan akun/perubahan role tidak dilakukan ulang pada sesi ini. Pengujian live terdahulu dicatat terpisah, tidak diklaim sebagai klik browser hari ini.

## Pemeriksaan teknis terbaru

| Pemeriksaan | Hasil | Arti |
|---|---|---|
| test:roles | 180 lulus, 0 gagal | Enam login Auth/profil/route HTTP/RLS/logout; bukan enam sesi visual lengkap |
| test:pdf-fixtures | 36/36 lulus | PostgreSQL terisolasi dengan fixture PDF, bukan 36 transaksi browser Supabase |
| test:multiline | 7/7 lulus | Regresi transaksi multi-line di database terisolasi |
| test:compact-ui | Lulus | Smoke HTTP/form, bukan pengganti inspeksi visual |
| verify:video, :pos, :hold | Lulus | Membaca dan mencocokkan transaksi historis; tidak membuat transaksi browser baru |
| Typecheck, lint, production build | Lulus | Build verifikasi terpisah dari server preview |

## Yang belum selesai

- **T-01–T-36 belum 36/36 dibuktikan sebagai alur klik browser dengan fixture PDF yang tepat.** T-18 memiliki uji browser kuantitas berlebih. Penolakan retur dan pembayaran adalah analog kontrol, bukan pengganti seluruh langkah T-34/T-24 yang spesifik. Skenario lain memiliki bukti backend atau baca dokumen, bukan klaim browser PASS.
- Belum seluruh state visual: Delivery/Backorder, approval, POS expiry/variance, print preview, semua transisi role, serta ukuran layar lain.
- Pengulangan fixture lengkap perlu lingkungan uji terpisah; database bersama telah berisi histori dan tidak boleh di-reset untuk memaksakan angka baseline.
- Deployment publik belum diverifikasi. Aplikasi belum boleh disebut lengkap/siap produksi/100% sesuai PDF berdasarkan audit ini.

Bukti: seluruh file PNG/TXT dan results.json di folder laporan ini. Sebagian screenshot Settings memuat alamat akun pengguna; jangan unggah seluruh folder secara publik tanpa peninjauan. Perubahan sesi ini belum di-push ke GitHub.
