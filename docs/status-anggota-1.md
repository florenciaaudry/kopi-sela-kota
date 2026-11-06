# Status anggota 1: jangan disamakan dengan role Sales

Pembaruan 6 November 2026, setelah review commit teman dan perbaikan POS.

## Yang terbukti pada versi terkini

- Semua 114 pemeriksaan login dan batas akses enam role lulus. Akun Sales lulus 19 pemeriksaan yang menjadi cakupannya. PASS untuk menu terlarang berarti akses berhasil ditolak.
- Login Sales di browser berhasil. Menu hanya Sales/CRM. Daftar Sales, formulir pesanan baru, dan dropdown pelanggan terbuka; pilihan C05 tampil pada formulir.
- Regresi database: CRM Qualified dan Lost dengan alasan; penolakan Lost tanpa alasan; penolakan kredit C06; SO dan pembayaran idempoten; penolakan invoice sebelum pengiriman; pengiriman sebagian dan penolakan pengiriman berlebih; invoice Rp33.000 untuk 1 barang terkirim; pembayaran Rp10.000 menyisakan Rp23.000; penolakan pembayaran berlebih. Pertama memakai QA Owner, lalu diulang dengan klaim QA Sales untuk CRM/SO, Warehouse untuk pengiriman, Finance untuk invoice/pembayaran. Semua perubahan transaksi uji di-rollback.
- Checkout POS kini benar-benar diperbaiki pada database: tender Cash/Bank, penolakan sesi tertutup dan tender tidak lengkap, replay tanpa duplikat, serta penolakan replay dengan tender berbeda diuji. Fungsi aktif cocok dengan migrasi 008 lokal setelah whitespace diabaikan.

## Yang belum boleh disebut selesai

PDF halaman 23, 25–27, 31 dan 33 meminta lebih dari login dan satu alur berhasil:

| Kebutuhan | Status |
|---|---|
| Kontak pelanggan: form termin, limit kredit, piutang, ruang kredit, relasi dan refresh (T-03) | Belum lengkap pada UI |
| CRM dan catatan perubahan (T-07–T-08) | RPC inti diuji; relasi dan jejak lengkap pada UI masih perlu dilengkapi |
| Quotation → Quotation Sent → Sales Order (T-09) | Belum dibuat; UI masih langsung membuat SO |
| Pratinjau diskon dan persetujuan Owner untuk >5–10% (T-09–T-10) | Belum lengkap; saat ini diskon di atas 5% ditolak |
| Pengiriman dan invoice parsial (T-11–T-12, T-19–T-20) | Regresi inti lulus; fixture bersih dan seluruh bukti PDF belum dijalankan |
| Pembayaran parsial dan jurnal (T-23–T-26) | Regresi yang disebut lulus; bukan seluruh fixture dan kontrol PDF |
| Dokumen terkait, status, audit/Log Notes, smart buttons dan visual semua layar | Belum lengkap |

**Kesimpulan: akses role Sales lulus seluruh pemeriksaan yang dijalankan; pekerjaan anggota 1 belum 100% sesuai PDF.**

Jangan membetulkan CP00004 dengan menyalin total invoice. Database merekam Rp330; nominal yang dimaksud penguji belum dikonfirmasi. Migrasi 007 lama dinonaktifkan supaya tidak mengubah pembayaran/jurnal historis diam-diam. Rincian barang dan tender POSR00001/POSR00002 sudah dilengkapi dari snapshot struk yang cocok dengan jurnal posted, masing-masing dengan satu audit perbaikan (migrasi 009). Saldo, stok dan jurnal tidak diubah. HOLD/00001 tetap Expired karena penjualan penggantinya terjadi setelah batas waktunya; ini bukan bukti checkout hold tepat waktu.

Bukti: docs/role-test-results.json dan docs/review-regression-results.json. Pengujian RPC dengan klaim role melalui SQL Editor bukan pengganti seluruh klik browser melalui akun staff. Tidak ada seed/reset. Nomor urut bisa melompat karena sequence PostgreSQL tidak ikut rollback.
