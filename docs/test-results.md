# Test Results

Kasus T-01–T-36 belum dijalankan penuh sesuai fixture PDF. Pengguna melaporkan migrasi 002–003 telah dijalankan; akses dashboard Owner melalui `get_owner_dashboard` dan pembacaan modul terverifikasi, tetapi seluruh object dan keberhasilan eksekusi bundle tidak diverifikasi independen. T-04, T-08, T-14, dan T-18 telah dicoba sebagai skenario penolakan tanpa membuat transaksi sukses. T-10 belum dapat dipenuhi karena fitur approval diskon di atas 5% belum tersedia. Tes transaksi sukses tetap memerlukan fixture/project uji terisolasi atau izin untuk membuat data persisten pada project aktif.

## Pemeriksaan integrasi transaksi — 5 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| TypeScript dan ESLint setelah perbaikan POS | `npm run typecheck` dan `npm run lint` lulus. Typecheck awal menemukan query POS yang kurang di-destructure; sudah diperbaiki dan diverifikasi ulang. | Lulus |
| Production build | `npm run build` lulus; semua route Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibangun. | Lulus |
| Migrasi PostgreSQL | Foundation 93 statement, transaksi 122 statement, dan POS 29 statement berhasil diparse dengan pglast. Parser tidak mengeksekusi PL/pgSQL atau migrasi di database; pengguna kemudian menerapkan bundle incremental. | Lulus statis |
| SQL bundles terbaru | `setup.sql` 270 statement dan `apply-transactions.sql` 153 statement berhasil diparse. Bundle incremental hanya berisi migrasi setelah foundation (002 dan 003), tanpa seed, dan dibungkus transaksi. | Lulus statis |
| Server aplikasi lokal | `GET /login` HTTP 200; `/sales` tanpa sesi HTTP 307 menuju login. Setelah root redirect placeholder dihapus, dashboard `/` berhasil dimuat. | Smoke check lulus |
| Supabase Auth dan REST | `/auth/v1/settings` HTTP 200. REST `profiles` menolak role anon dengan permission denied (akses memang dibatasi); login Owner kemudian berhasil dan query profil/inventory terautentikasi berhasil. | Koneksi dan pembacaan terautentikasi lulus |
| Login, profil, dan hak akses Owner | Dashboard menampilkan profil ber-role Owner dan aplikasi sesuai role. Query database menunjukkan 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai stok Rp4.290.000. Delapan aplikasi tampil; fixture T-01 mengharapkan tujuh. | Lulus sebagian |
| Persistensi sesi setelah refresh | Setelah reload dashboard, sesi tetap aktif dan profil Owner tetap terbaca. | Lulus |
| Kompilasi migrasi di database | Percobaan apply pertama gagal saat kompilasi `create_sales_order` karena literal `%` pada pesan batas diskon; sumber diperbaiki menjadi `%%`. Pengguna melaporkan menjalankan bundle incremental, dan RPC dashboard tersedia; eksekusi keseluruhan bundle tidak diverifikasi independen. | Perbaikan dan akses RPC terverifikasi; keseluruhan migrasi belum dikonfirmasi independen |
| SQL bundle sesudah perbaikan | 002 (122 statements) dan 003 (29 statements) cocok dengan sumber; bundle incremental 153 statements memuat `get_owner_dashboard()`. Parser statis bukan pengganti eksekusi database. | Lulus statis; pengguna melaporkan apply, tidak diverifikasi keseluruhan |
| Ringkasan keuangan Owner | RPC `get_owner_dashboard` berhasil dipanggil. AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.000.000; stok 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai Rp4.290.000. | Lulus baca live |
| Modul ERP | Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns menampilkan data baseline Supabase. | Lulus baca live |
| T-04 | SO C02 qty 3 CBW-250 ditolak oleh RPC: eksposur Rp319.000 melampaui limit Rp300.000; daftar SO tetap hanya berisi S00001. | Lulus penolakan |
| T-08 | Lead L00001 dengan status Lost tanpa alasan ditolak di server action; status tetap New dan RPC tidak dipanggil. | Lulus validasi action; RPC belum diuji |
| T-10 | Diskon 6% ditolak oleh batas validasi 0–5%; alur approval Owner belum tersedia. | Belum didukung; T-10 tidak lulus |
| T-14 | Transfer 31 CBW-250 dari WH-TBT ditolak karena Available hanya 30. Sesudahnya WH tetap 40 unit/10 reserved/30 available dan CAFE tetap 20 unit/0 reserved/20 available. | Lulus penolakan; saldo tidak berubah |
| T-18 | Penerimaan 21 unit untuk PO00001 ditolak karena melebihi sisa kuantitas PO; PO tetap Rp300.000 dan tidak ada Goods Receipt baru. | Lulus penolakan; saldo tidak berubah |
| Tes transaksi sukses, persistensi stok/jurnal, dan rollback | Belum diuji pada project live; mutasi sukses akan membuat data keuangan/inventori permanen. | Belum diuji |
| T-01 | Owner, 15 SKU, 2 lokasi, dan stok terverifikasi; aplikasi aktual berjumlah 8, sedangkan fixture mengharapkan 7. | Parsial |

## Pemeriksaan pondasi dan mode demo sebelumnya — 5 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| TypeScript, ESLint, production build | `npm run typecheck`, `npm run lint`, dan `npm run build` lulus. Build memakai `.next-local` karena output `.next` lama berisi placeholder OneDrive yang gagal dihapus. | Lulus |
| Bundle SQL awal | 119 statement gabungan migrasi+seed berhasil diparse; hasil tersebut mendahului migrasi transaksi baru. | Lulus statis historis |
| Navigasi workspace | `/`, `/sales`, `/crm`, `/purchase`, `/inventory`, `/accounting`, `/invoicing`, `/pos`, `/returns` terbuka dan masing-masing menunjukkan banner MODE DEMO. | Smoke check browser |
| Baseline demo | 15 SKU, 480 unit, nilai stok Rp4.290.000; AR Rp220.000; AP Rp300.000; Kas Rp500.000; Bank Rp10.000.000. Reset mengembalikan fixture ke angka tersebut. | Lulus browser |
| Limit kredit | C02 dengan AR Rp220.000 + pesanan 3 CBW-250 senilai Rp99.000 ditolak pada eksposur Rp319.000 vs limit Rp300.000. | Lulus browser demo |
| Sales → delivery → invoice → retur | S00002 qty 2 terkirim; invoice demo Rp60.000 + PBJT Rp6.000; Credit Note sealed 2 unit Rp66.000 dan stok kembali. | Lulus browser demo |
| Purchase → receipt → bill → payment | PO demo 2 CBW-250; receipt accepted 2; Bill Rp30.000; payment Bank melunasi saldo Bill menjadi Rp0. | Lulus browser demo |
| POS | Struk demo Cash KSU-250 qty 1 total Rp27.500. | Lulus browser demo |
| CRM | Lead demo dibuat; status Lost tanpa alasan ditolak; alasan “Jadwal acara berubah” tersimpan. | Lulus browser demo |
| Koneksi Supabase | `/auth/v1/settings` dengan publishable key merespons HTTP 200. REST API mengenali key, tetapi query `profiles` merespons 404 (tabel belum dibuat). | Kredensial/koneksi valid; schema belum diterapkan |
| Login UI | Setelah server direstart, halaman login menampilkan input email/password aktif. Tidak ada akun Owner untuk submit dan menguji autentikasi. | UI/config OK; login aktual belum diuji |

Seluruh pemeriksaan interaksi di atas berjalan dalam localStorage browser dan bukan eksekusi Supabase, bukan bukti ledger production, dan bukan hasil pass T-01–T-36.

| ID | Hasil harapan ringkas | Aktual | Status |
|---|---|---|---|
| T-01 | Owner melihat 7 aplikasi, 15 SKU, dan 2 lokasi. | Owner, 15 SKU, 2 lokasi terverifikasi; 8 aplikasi tampil (fixture harapkan 7). | Parsial |
| T-02 | Cashier ditolak membuka jurnal langsung; S00001 tetap ada setelah refresh. | Belum diuji; akun/sesi Cashier tidak tersedia dalam sesi verifikasi. | Belum diuji |
| T-03 | C06 tersimpan COD/limit Rp0; C02 memiliki piutang Rp220.000, limit Rp300.000, ruang Rp80.000. | C02 AR Rp220.000 dan limit Rp300.000 terverifikasi; COD/limit C06 belum diverifikasi. | Parsial |
| T-04 | C02: eksposur Rp220.000 + 3 × CBW-250 (Rp99.000 termasuk PBJT) = Rp319.000; SO ditolak karena melampaui limit Rp300.000, tanpa reservasi baru. | RPC menolak; daftar SO tetap hanya S00001. | Lulus penolakan |
| T-05 | CBW-250: harga Rp30.000, biaya Rp15.000, stok 60; CBW-500: Rp40.000, Rp22.000, stok 30; unit unit. | Data live cocok: CBW-250 total 60 (WH 40, CAFE 20), CBW-500 total 30 (WH 20, CAFE 10); harga/biaya sesuai fixture. | Lulus baca |
| T-06 | SKU duplikat ditolak; katalog CBW-250 boleh menjadi Rp36.000, tetapi S00001 tetap memakai snapshot Rp30.000. | Belum diuji | Belum diuji |
| T-07 | L00001 menjadi Qualified, C03 tetap terkait, expected net Rp300.000, probabilitas 40%, tertimbang Rp120.000. | Belum diuji | Belum diuji |
| T-08 | Lost tanpa alasan ditolak; setelah alasan “Jadwal acara berubah” tersimpan dengan jejak perubahan. | Tanpa alasan ditolak di server action; Lead L00001 tetap New. Alur dengan alasan dan jejak perubahan belum diuji. | Parsial |
| T-09 | Preview diskon 5%: net Rp285.000, PBJT Rp28.500, total Rp313.500. SO diskon 0%: total Rp330.000; WH-TBT 40/20/20; eksposur C03 Rp330.000; piutang baru Rp0. | Belum diuji | Belum diuji |
| T-10 | Diskon 6% ditahan hingga Owner menyetujui; setelah konfirmasi harga/discount terkunci dan perubahan ditolak. | Diskon 6% ditolak batas validasi 0–5%; mekanisme approval belum tersedia. | Tidak didukung |
| T-11 | Kirim 8 dari 10: Delivered 8, backorder 2; WH-TBT 32/12/20; perusahaan 472 unit; stok Rp4.170.000; COGS Rp120.000; AR tetap Rp220.000. | Belum diuji | Belum diuji |
| T-12 | Pengiriman 3 saat sisa 2 ditolak tanpa perubahan; sisa 2 yang sah dapat dikirim dan dibukukan sekali. | Belum diuji | Belum diuji |
| T-13 | Transfer 5 CBW-250: WH-TBT 35/10/25; CAFE-TBT 25/0/25; perusahaan tetap 480 unit/Rp4.290.000; tidak ada pendapatan, PBJT, atau jurnal baru. | Belum diuji | Belum diuji |
| T-14 | Transfer 31 ditolak karena Available WH-TBT hanya 30; dua lokasi tidak berubah. | Transfer 31 ditolak; WH 40/10 reserved/30 available dan CAFE 20/0/20 tetap. | Lulus penolakan |
| T-15 | PO V01 untuk 20 CBW-250 total Rp300.000 tanpa pajak; stok 480 dan utang Rp300.000 tidak berubah. | Belum diuji | Belum diuji |
| T-16 | Konfirmasi ulang identik tidak membuat PO/posting kedua; harga dokumen terkonfirmasi terkunci. | Belum diuji | Belum diuji |
| T-17 | Dari PO 20, datang 20, accepted 16, rejected 4: stok 496 unit/Rp4.530.000; 2103 bertambah Rp240.000; utang tetap Rp300.000. | Belum diuji | Belum diuji |
| T-18 | Accepted 21 dari 20 yang datang ditolak; stok dan jurnal tidak berubah. | Penerimaan 21 unit untuk PO00001 ditolak melebihi sisa kuantitas; PO tetap Rp300.000 dan tidak ada Goods Receipt. | Lulus penolakan |
| T-19 | Invoice delivery 8: net Rp240.000, PBJT Rp24.000, due Rp264.000; AR Rp484.000; stok tetap Rp4.170.000; eksposur C03 Rp330.000. | Belum diuji | Belum diuji |
| T-20 | Invoice final untuk SO S00001 dengan Delivered 0 ditolak; tidak ada pendapatan/piutang/jurnal baru. | Belum diuji | Belum diuji |
| T-21 | Bill untuk 16 accepted: Rp240.000, pajak Rp0; AP Rp540.000; saldo 2103 Rp0; stok Rp4.530.000. | Belum diuji | Belum diuji |
| T-22 | Bill atas 20 saat accepted 16: hanya 16 dapat diposting; selisih 4 ditahan dan tidak jadi AP. | Belum diuji | Belum diuji |
| T-23 | Payment Bank Rp100.000: invoice sisa Rp164.000; AR Rp384.000; Bank Rp10.100.000; Kas Rp500.000; eksposur C03 Rp230.000. | Belum diuji | Belum diuji |
| T-24 | Bill Rp240.000 dibayar Rp100.000; pembayaran lanjut Rp140.001 ditolak; sisa Rp140.000 dan Bank tidak berubah akibat percobaan kedua. | Belum diuji | Belum diuji |
| T-25 | Jurnal transaksi seimbang Rp484.000 per sisi: Delivery Rp120.000, invoice Rp264.000, payment Rp100.000; net sales Rp240.000, PBJT Rp24.000, COGS Rp120.000. | Belum diuji | Belum diuji |
| T-26 | Validasi Receipt dan posting Bill dengan idempotency sama tidak menambah jurnal atau mengubah saldo lagi. | Belum diuji | Belum diuji |
| T-27 | Sesi dibuka sekali dengan Rp100.000 yang sudah termasuk Kas perusahaan Rp500.000; 480 unit; tidak ada penjualan/jurnal baru. | Belum diuji | Belum diuji |
| T-28 | Kas hitung Rp99.000 vs harapan Rp100.000 menghasilkan selisih -Rp1.000; penutupan menunggu alasan dan persetujuan Owner. | Belum diuji | Belum diuji |
| T-29 | Hold P00001 sampai 09.10: 2 CBW-250 dan 1 TEH-250 direservasi; total 480 unit, Reserved 13, Available 467; belum ada jurnal. | Belum diuji | Belum diuji |
| T-30 | Konfirmasi ulang tidak menambah reservasi; order 19 unit ditolak; pembatalan melepas tepat sekali; hold baru expired 09.16 dan dilepas tepat sekali. | Belum diuji | Belum diuji |
| T-31 | Cash Rp39.600 + Bank Rp33.000 melunasi Rp72.600 dengan satu struk; COGS Rp32.000; Kas Rp539.600, Bank Rp10.033.000, laci Rp139.600; stok 477/Rp4.258.000. | Belum diuji | Belum diuji |
| T-32 | Tender parsial tidak mengubah saldo/jurnal/stok/struk lunas; pelunasan dan retry menghasilkan satu transaksi; invoice kedua ditolak. | Belum diuji | Belum diuji |
| T-33 | Retur 2 tersegel: Credit Note Rp66.000; AR Rp418.000; stok 474/Rp4.200.000; net COGS Rp90.000; tanpa refund sebelum invoice dibayar. | Belum diuji | Belum diuji |
| T-34 | Retur rusak tidak menambah stok; Credit Note idempoten; 7 tambahan ditolak karena melebihi sisa maksimum 6 unit. | Belum diuji | Belum diuji |
| T-35 | Dashboard periode 20 Okt: net Rp240.000, PBJT Rp24.000, COGS Rp120.000, margin Rp120.000, AR Rp384.000, AP Rp300.000, Bank Rp10.100.000, Kas Rp500.000, stok 472/Rp4.170.000. | Belum diuji | Belum diuji |
| T-36 | Dashboard menelusuri invoice → Delivery/SO/Payment; Cashier tidak dapat membaca jurnal; pengulangan baca tidak mengubah saldo. F-21 ekspor belum dibangun. | Belum diuji | Belum diuji |

T-01 baru **terverifikasi sebagian**. T-04, T-08, T-14, dan T-18 punya hasil penolakan aktual yang dicatat di atas; T-10 menunjukkan gap implementasi approval. T-02, T-06–T-07, T-09, T-11–T-13, T-15–T-17, T-19–T-36 belum dijalankan sesuai fixture. Keberhasilan baca live dan penolakan transaksi tidak membuktikan alur mutasi sukses, persistensi stok/jurnal, rollback, atau isolasi role. Tes sukses perlu fixture/project terisolasi atau izin untuk menulis data uji persisten ke project aktif.

## Gap implementasi yang sudah diketahui

Status tes di tabel tetap **Belum diuji**; daftar ini mencatat fitur yang memang belum tersedia penuh agar tidak disalahartikan sebagai sekadar menunggu koneksi:

| Cakupan | Status implementasi |
|---|---|
| T-06 | Ubah harga katalog belum memiliki UI/RPC; snapshot harga Sales Order sudah disimpan. |
| T-10 | Persetujuan Owner untuk diskon di atas 5% belum dibuat; RPC saat ini menolak diskon lebih dari 5%. |
| T-29–T-30 | RPC hold multi-item (UI maksimum dua SKU), reservasi, idempotency, pembatalan, dan expiry tersedia di migrasi 003. Pemicu expiry masih manual melalui UI; belum ada scheduler dan belum diuji pada DB. |
| T-31–T-32 | RPC penyelesaian hold dan split tender Cash/Bank tersedia di migrasi 003; validasi mensyaratkan pelunasan dan replay struk idempoten. Partial tender dan cart dengan jumlah baris bebas belum tersedia; belum diuji pada DB. |
| T-35–T-36 | Dashboard berisi saldo persediaan, piutang, utang, Kas, dan Bank; laporan periode, net sales/COGS/margin, drill-down, dan ekspor belum lengkap. |
| F-21 | Ekspor tetap ditunda sampai kebutuhan Must lulus. |
