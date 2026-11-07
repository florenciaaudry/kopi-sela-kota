# Decision Log

Status keputusan berlaku untuk baseline simulasi. Alternatif yang mengubah aturan di PDF memerlukan persetujuan dosen sebelum diterapkan.

| ID | Kebutuhan yang bertentangan | Alternatif yang dipertimbangkan | Keputusan baseline | Konsekuensi dan mitigasi | Persetujuan dosen |
|---|---|---|---|---|---|
| D-01 | SR-01 meminta invoice final 100% saat SO dikonfirmasi; SR-02 membatasi invoice pada kuantitas Delivered. | (A) Tagih seluruh pesanan saat konfirmasi; (B) tagih kuantitas Delivered dan belum pernah ditagih. | Pilih B. Konfirmasi SO hanya mengunci harga dan mereservasi stok; tidak membuat pendapatan atau piutang. | Arus kas masuk lebih lambat bagi tim Sales. Pengiriman dan invoice parsial tetap dapat ditelusuri; eksposur kredit menghitung bagian SO belum ditagih tanpa menghitung ganda ketika invoice dibuat. | Diperlukan untuk menerapkan A. |
| D-02 | SR-03 meminta kasir menjual satu pesanan saat stok sistem nol; SR-04 melarang On Hand/Available negatif dan melarang memakai reservasi pihak lain. | (A) Izinkan oversell/override; (B) tolak penjualan sampai Available mencukupi. | Pilih B untuk baseline. POS hanya memakai Available CAFE-TBT dan tidak dapat mengambil reservasi SO atau keranjang lain. | Antrean bisa tertunda saat stok tidak akurat. Tampilkan alasan stok, sediakan jalur koreksi/penerimaan stok yang diaudit; jangan membuat saldo negatif. | Diperlukan untuk menerapkan A. |
| D-03 | SR-05 meminta bayar seluruh PO setelah konfirmasi; SR-06 membatasi bill dan pembayaran pada barang yang diterima serta diterima-baik. | (A) Bayar penuh sebagai uang muka saat PO; (B) buat Bill/Payment setelah penerimaan diterima-baik. | Pilih B. PO tidak membentuk persediaan, utang, atau pembayaran. Receipt hanya menambah unit diterima-baik; Vendor Bill dibatasi kuantitas tersebut. | Pemasok yang meminta dana di muka dapat menunggu. Akun uang muka pemasok (1302) tersedia pada chart, tetapi alur uang muka belum diaktifkan tanpa kebijakan dan persetujuan dosen. | Diperlukan untuk menerapkan A. |
| D-04 | F-21 merupakan fitur ekspor opsional, sedangkan semua Must perlu berfungsi dahulu. | (A) Bangun ekspor sejak awal; (B) tunda sampai seluruh Must teruji. | Pilih B sesuai prioritas PDF. | Ekspor tidak tersedia pada tahap awal; data tetap dapat ditelusuri melalui layar dan dokumen sesuai hak akses. | Tidak diperlukan untuk penundaan sesuai PDF. |

## Prinsip penerapan

- Perubahan yang ditolak tidak boleh meninggalkan perubahan saldo sebagian.
- Pembalikan resmi digunakan untuk koreksi posting; histori terposting tidak dihapus.
- Setiap penyimpangan baru dari keputusan ini harus menambahkan alternatif, pihak yang terdampak, mitigasi, uji tambahan, dan status persetujuan dosen.

## D-05 — approval selisih POS (migrasi 017)

Counted Cash berbeda dari Expected Cash selalu menjadi Pending Approval, termasuk penutupan oleh Owner. Persetujuan Owner secara eksplisit membuat satu jurnal selisih: Cash 1101 versus Expense 6101, dengan arah debit/kredit mengikuti surplus/kekurangan. Replay tidak membuat jurnal kedua. Tidak mem-posting ulang selisih sesi historis. T-28 terisolasi membuktikan selisih -1000 dan approval tepat sekali; approval selisih live baru belum dilakukan.
