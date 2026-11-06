# Review perubahan teman — 6 November 2026

## Sinkronisasi

Laptop Florencia sebelumnya berada di a5577a6. Origin/main dan branch test/fanny-sales-purchase menunjuk 77ca12e. Working tree bersih sebelum sinkronisasi. Fast-forward berhasil tanpa konflik, mencakup 22 file. Fetch/pull hanya menyinkronkan kode; tidak memasang migrasi pada database bersama.

## Temuan dan perbaikan lokal

1. **Kritis — angka laporan berbeda dari database.** Fungsi reconcileCp00004 mengubah invoice, pembayaran, jurnal, dan saldo hanya saat ditampilkan, berdasarkan nomor dokumen tertentu. Pembayaran sah sebagian Rp330 pun dapat ditampilkan sebagai Rp330.000. Semua pemakaian koreksi tampilan dihapus; laporan sekarang memakai hasil database.
2. **Kritis — checkout hold tidak atomik.** Ketika complete_pos_hold gagal, server membatalkan hold lalu memanggil create_pos_sale per baris. Kegagalan di tengah dapat meninggalkan penjualan sebagian, tanpa kaitan hold dan rincian tender. Jalur ini dihapus. Checkout hanya memanggil RPC complete_pos_hold, yang harus berhasil atau rollback sebagai satu transaksi.
3. **Tinggi — data POS sintetis.** UI sebelumnya mengarang status Completed, baris struk, tender, expected cash, dan pemisahan jurnal dari idempotency key. Pemakaian tersebut dihapus. Struk menampilkan peringatan apabila rincian tender tidak ada di database.
4. **Tinggi — pelanggaran waktu hold.** Migrasi 008 memperpanjang semua hold Open dan reservasi aktif menjadi 24 jam. Pernyataan ini dihapus; bundle SQL dibuat ulang tanpa menjalankannya di Supabase. Perbaikan variabel PL/pgSQL tender_row dipertahankan.
5. **Tinggi — input nominal berubah diam-diam.** Normalisasi sebelumnya membuang semua karakter selain digit, sehingga -330.000 dapat berubah menjadi +330.000 dan 12.34 menjadi 1.234. Sekarang input tidak valid dipertahankan untuk ditolak, dengan regresi untuk nilai negatif, pecahan, notasi eksponen, dan teks campuran.

Perbaikan dropdown Sales Order dan nominal Rupiah yang valid tetap dipertahankan. Dropdown baru dan dialog memerlukan pengujian interaksi browser oleh kedua laptop; build saja tidak membuktikan keterpakaian UI.

## Pembacaan database langsung (tanpa menulis transaksi)

- CP00004 untuk INV00003: amount **330**.
- INV00003: total **330000**, amount_paid **330**; belum lunas menurut database.
- HOLD/00001: **Expired**, dibuat 08:02:10 UTC dan expires 08:12:10 UTC (sekitar 10 menit).
- POSR00002: total **35200**, CASH, hold_number **NULL**, dengan key legacy hold-complete:HOLD/00001:... .
- pos_receipt_tenders mengembalikan **0 baris** untuk sesi baca Owner ini.

Ini bukti ketidaksesuaian pencatatan historis, bukan bukti uang Rp330.000 benar-benar diterima. Jangan menandai invoice lunas hanya berdasarkan nominal invoice atau niat penguji.

## Yang belum diselesaikan

- Migrasi 007 menyasar pembayaran historis dan mengubah jurnal yang sudah diposting. Jangan menjalankannya otomatis: konfirmasi nominal pembayaran yang benar, periksa jurnal lengkap, dan tentukan koreksi yang mempertahankan jejak audit sesuai PDF.
- Pemasangan definisi fungsi migrasi 008 pada database aktif belum diverifikasi; file lokal bukan bukti migrasi telah terpasang. Jangan jalankan setup.sql, seed, atau seluruh apply-transactions.sql pada database bersama.
- Data legacy POS perlu rekonsiliasi resmi pada database, termasuk kaitan hold, tender, stok/reservasi, expected cash, serta jurnal. Mengubah tampilan tidak memperbaiki data tersebut.
- Tidak ada transaksi, migrasi, reset, atau seed yang dijalankan selama review ini.
- T-01–T-36 dan uji visual semua layar belum diulang. Hasil enam role dari sesi sebelumnya bukan hasil tes ulang commit ini.

## Verifikasi perubahan review

- test:rupiah-format: PASS, termasuk penolakan input yang sebelumnya berubah menjadi nilai positif/berbeda.
- test:pos-cart: PASS, termasuk guard satu RPC checkout, tidak ada transaksi pengganti, dan tidak ada ekstensi hold 24 jam.
- typecheck: PASS setelah koreksi import formatRupiah pada review.
- Lint eksplisit tujuh file yang diubah dan lint seluruh proyek: PASS.
- Production build terpisah (.next-check, webpack): PASS.

Teman yang melanjutkan harus pull commit review terbaru sebelum mengedit lagi. Gunakan transaksi baru dengan catatan sebelum/sesudah dan jangan menganggap dokumen legacy yang disebut di atas sudah diperbaiki.
