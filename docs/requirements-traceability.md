# Matriks keterlacakan

Sumber kebutuhan adalah `24SI3 - Group 04 - Coffee Shop.pdf`. Status implementasi awal semuanya **belum diimplementasikan**; status pengujian **belum diuji**.

## Aturan bisnis SR

| SR | Cakupan | Status |
|---|---|---|
| SR-01 | Permintaan invoice penuh pada SO; konflik dicatat di D-01 | Keputusan baseline |
| SR-02 | Invoice hanya untuk Delivered yang belum ditagih | Belum diimplementasikan |
| SR-03 | Permintaan menjual saat stok nol; konflik dicatat di D-02 | Keputusan baseline |
| SR-04 | On Hand/Available tidak negatif; Available = On Hand - Reserved | Belum diimplementasikan |
| SR-05 | Permintaan bayar PO penuh; konflik dicatat di D-03 | Keputusan baseline |
| SR-06 | Receipt accepted membatasi Bill dan pembayaran | Belum diimplementasikan |
| SR-07 | Diskon 0–5%; >5–10% persetujuan Owner; >10% ditolak; harga terkunci | Belum diimplementasikan |
| SR-08 | Eksposur kredit tidak menghitung SO/invoice dua kali | Belum diimplementasikan |
| SR-09 | Retur dibatasi delivery asal; inspeksi menentukan restock; Credit Note tepat sekali | Belum diimplementasikan |
| SR-10 | Transfer dari Available; kuantitas dan nilai perusahaan tetap | Belum diimplementasikan |
| SR-11 | Payment positif dan maksimal Amount Due; Kas/Bank terpisah | Belum diimplementasikan |
| SR-12 | SKU unik per produk/ukuran; unit stok; varian tidak saling menggantikan | Belum diimplementasikan |
| SR-13 | KPI dapat ditelusuri ke dokumen; margin = net sales - COGS | Belum diimplementasikan |
| SR-14 | Dokumen dan posting idempoten | Belum diimplementasikan |
| SR-15 | Enam role, otorisasi server/database, audit pelaku/waktu/aksi/dokumen | Belum diimplementasikan |
| SR-16 | Kontrol kas sesi dan persetujuan Owner untuk selisih | Belum diimplementasikan |
| SR-17 | Hold POS maks. 10 menit, lepas tepat sekali, tender campuran | Belum diimplementasikan |
| SR-18 | PBJT 10% setelah diskon, half-up per baris, tanpa service charge/tips/invoice POS kedua | Belum diimplementasikan |
| SR-19 | Receipt mencatat datang/accepted/rejected; accepted saja menambah stok; tax beli 0 | Belum diimplementasikan |
| SR-20 | Nomor/status/relasi/Log Notes, jurnal seimbang, koreksi dengan reversal | Belum diimplementasikan |

## Fitur F dan layar S

| Fitur | Layar utama | Status |
|---|---|---|
| F-01 Navigasi dan otorisasi | S-01 | Belum diimplementasikan |
| F-02 Kontak dan termin kredit | S-02 | Belum diimplementasikan |
| F-03 Produk dan SKU varian | S-03 | Belum diimplementasikan |
| F-04 Pipeline peluang | S-04 | Belum diimplementasikan |
| F-05 Quotation/Sales Order | S-05 | Belum diimplementasikan |
| F-06 Diskon dan penguncian harga | S-05 | Belum diimplementasikan |
| F-07 Reservasi dan ketersediaan | S-05, S-15 | Belum diimplementasikan |
| F-08 Pengiriman parsial/backorder | S-06 | Belum diimplementasikan |
| F-09 Customer Invoice | S-10 | Belum diimplementasikan |
| F-10 Eksposur kredit | S-02, S-05 | Belum diimplementasikan |
| F-11 RFQ/Purchase Order | S-08 | Belum diimplementasikan |
| F-12 Receipt/inspeksi | S-09 | Belum diimplementasikan |
| F-13 Vendor Bill/three-way match | S-11 | Belum diimplementasikan |
| F-14 Jurnal/COGS | S-13 | Belum diimplementasikan |
| F-15 Pembayaran sebagian | S-12 | Belum diimplementasikan |
| F-16 Sesi POS dan hold | S-14, S-15 | Belum diimplementasikan |
| F-17 Pembayaran campuran/struk | S-16 | Belum diimplementasikan |
| F-18 Retur/Credit Note | S-17 | Belum diimplementasikan |
| F-19 Transfer lokasi | S-07 | Belum diimplementasikan |
| F-20 Dashboard/audit/relasi | S-13, S-18 | Belum diimplementasikan |
| F-21 Ekspor (opsional, sesudah semua Must) | S-18 | Ditunda |

## Pengujian

| Rentang | Cakupan ringkas | Status |
|---|---|---|
| T-01–T-02 | Beranda, seed, akses role, persistensi | Belum diuji |
| T-03–T-04 | Kontak, limit, eksposur | Belum diuji |
| T-05–T-06 | SKU, harga katalog, penguncian SO | Belum diuji |
| T-07–T-08 | Lead/opportunity, alasan Lost | Belum diuji |
| T-09–T-10 | Quotation, diskon, approval, reservasi, kredit | Belum diuji |
| T-11–T-12 | Delivery parsial, backorder, COGS | Belum diuji |
| T-13–T-14 | Transfer dan batas Available | Belum diuji |
| T-15–T-16 | RFQ/PO, idempotensi, kunci harga | Belum diuji |
| T-17–T-18 | Receipt accepted/rejected dan validasi kuantitas | Belum diuji |
| T-19–T-20 | Invoice berdasar delivery dan penolakan invoice dini | Belum diuji |
| T-21–T-22 | Vendor Bill/three-way match | Belum diuji |
| T-23–T-24 | Payment sebagian dan penolakan lebih bayar | Belum diuji |
| T-25–T-26 | Ledger, jurnal seimbang, idempotensi posting | Belum diuji |
| T-27–T-28 | Pembukaan sesi dan approval selisih kas | Belum diuji |
| T-29–T-30 | Hold POS, reservasi, idempotensi, expiry | Belum diuji |
| T-31–T-32 | Tender campuran, posting sekali, tanpa invoice kedua | Belum diuji |
| T-33–T-34 | Inspeksi retur, Credit Note, batas retur | Belum diuji |
| T-35–T-36 | Dashboard, drill-down, audit, akses laporan/ekspor | Belum diuji |

Setiap test results akhir wajib mencatat fixture awal, langkah, expected, actual, status, dan bukti. Tidak ada hasil lulus yang diklaim sebelum pengujian dijalankan.
