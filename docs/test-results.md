# Test Results

T-01–T-36 belum dijalankan penuh sesuai fixture PDF. PDF sumber asli terbaca 43 halaman; matriks `docs/requirements-traceability.md` mencatat halaman, implementasi, tes, status, dan gap. Pada 5 Nov 2026 login Owner/dashboard serta satu siklus Sales/Purchase sampai lunas berhasil diuji live; transaksi itu persisten di database bersama. Pada 6 Nov pengguna mengonfirmasi migrasi 004–005 berhasil diterapkan; query halaman POS terautentikasi membaca kolom customer pada receipt tanpa error skema. Tidak ada seed, migrasi, atau transaksi POS baru yang dijalankan dalam pemeriksaan ini.

## Verifikasi lanjutan POS dan visual — 6 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| Migrasi POS 004/005 | Pengguna mengonfirmasi kedua migrasi berhasil dijalankan. Bundle lama tidak dijalankan ulang. UI POS Owner berhasil query `pos_receipts.customer_id` (tanpa fallback/peringatan migrasi) dan membaca daftar customer. | Dikonfirmasi pengguna; skema 005 terverifikasi melalui query baca aplikasi |
| Customer pada struk POS | Dropdown menampilkan C01–C06; C06 tampil dengan limit Rp0. Form menjelaskan POS adalah transaksi lunas yang tidak menambah piutang/menggunakan limit. Receipt table query berhasil dengan field customer. Belum ada struk customer-linked di data yang terlihat. | Schema dan UI lulus baca; transaksi simpan/replay belum diuji |
| Hold dan checkout | Form hold dan server-side expiry 10 menit tampil. Riwayat tidak memiliki hold; satu-satunya sesi yang terlihat `POS/00001` berstatus `Opening Control`, bukan `Open`, dan tidak tersedia hold untuk checkout. | UI lulus; transaksi hold/checkout belum diuji |
| Dampak data bersama | Tidak membuka sesi, membuat hold, membayar hold, atau membuat struk/jurnal. Langkah tersebut akan menulis histori permanen; pembatalan hold pun tetap meninggalkan rekam transaksi/audit. | Tidak ada mutasi pada database |
| Visual desktop | Screenshot diperiksa untuk dashboard Owner, Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns. Kontras krem/cokelat, judul, kelompok formulir, tombol utama, status, tabel, dan layout terbaca; tidak terlihat error pada halaman yang dimuat. | Review visual route dilakukan |
| Visual mobile 390px | Semua route ERP di atas diukur pada lebar 390px; `documentElement.scrollWidth` tidak melebihi viewport. Form POS menjadi satu kolom. Setelah perbaikan CSS, menu aplikasi dan workspace membungkus menjadi beberapa baris; seluruh item navigasi terlihat tanpa scroll horizontal. Hasil pengukuran POS: viewport 390px, lebar dokumen 375px, app switcher 110.8px, sidebar 91.8px. | Tidak ada overflow halaman/navigasi |
| Pemeriksaan teknis setelah perbaikan navigasi mobile | `npm run typecheck`, `npm run lint`, dan `npm run build` selesai sukses. Node runtime tidak ada di PATH default; pemeriksaan berhasil setelah folder Node yang sudah terpasang ditambahkan ke PATH proses. | Lulus |
| Halaman login | Tidak dapat ditinjau dalam keadaan sesi Owner aktif karena route login mengalihkan kembali ke dashboard. | Belum diperiksa pada sesi anonim |
| T-27–T-32 | Tidak ada sesi POS aktif untuk uji baca lanjutan; semua test mutasi/split tender/hold replay/checkout memerlukan sesi aktif dan menulis histori. | Belum diuji di DB; perlu fixture terisolasi atau izin transaksi permanen |

## Handoff verification — 5 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| Login Owner dan reload | Header menampilkan Florencia Audry · Owner; sesi bertahan setelah reload `/`; dashboard tetap dari Supabase. | Lulus |
| Dashboard awal | 15 SKU, 2 lokasi; 480 unit on hand, 10 reserved/470 available; nilai persediaan Rp4.290.000; AR Rp220.000; AP Rp300.000; Kas Rp500.000; Bank Rp10.000.000. | Lulus baca live |
| Sales order | C05, CBW-250 qty 1, total Rp33.000 → `S00002`. | Lulus |
| Delivery | `S00002`, qty 1 → `DN00001`; stok WH berkurang satu. | Lulus |
| Customer invoice | `S00002` → `INV00001`, Rp33.000 (net Rp30.000 + PBJT Rp3.000). | Lulus |
| Customer payment | `INV00001` lunas Rp33.000 via Bank → `CP00002`; saldo invoice menjadi Rp0. | Lulus |
| Purchase order | V01, CBW-250 qty 1 × Rp15.000 → `PO00002`. | Lulus |
| Goods receipt | `PO00002`, accepted 1/rejected 0 → `GR00001`; stok WH bertambah satu. | Lulus |
| Vendor bill | `PO00002` → `BILL00001` Rp15.000. | Lulus |
| Vendor payment | `BILL00001` lunas Rp15.000 via Bank → `VP00002`; saldo bill menjadi Rp0. | Lulus |
| Efek stok setelah kedua alur | Sales mengurangi 1 unit dan receipt menambah 1 unit CBW-250; total stok kembali 480, reserved 10, available 470, nilai persediaan Rp4.290.000. | Lulus; dashboard dan per lokasi konsisten |
| Efek saldo setelah kedua alur | AR tetap Rp220.000 dan AP tetap Rp300.000 karena invoice/bill baru dibayar penuh; Kas Rp500.000; Bank naik bersih Rp18.000 menjadi Rp10.018.000. | Lulus baca live |
| Efek jurnal | Enam jurnal baru seimbang: `JRN/20261105/00001` delivery (HPP/inventory Rp15.000), `00002` invoice (AR Rp33.000 = pendapatan Rp30.000 + PBJT Rp3.000), `00003` customer payment (Bank/AR Rp33.000), `00004` receipt (inventory/GRNI Rp15.000), `00005` vendor bill (GRNI/AP Rp15.000), `00006` vendor payment (AP/Bank Rp15.000). | Lulus baca live |
| SO untuk C06 COD/limit Rp0 | Percobaan 1 CBW-250 sebagai Sales Order belum dibayar ditolak RPC dengan eksposur Rp33.000 vs limit Rp0; tidak membuat SO. Batas kredit tidak diubah. Jalur langsung lunas adalah POS; C06 tampil pada selector dan skema receipt customer terbaca, tetapi posting receipt customer-linked belum diuji. | Penolakan kredit benar; simpan customer-linked belum diverifikasi |
| Persistensi setelah refresh | Dashboard tetap menunjukkan saldo akhir; daftar invoice/payment dan vendor bill/payment menampilkan dokumen lunas. | Lulus |
| Migrasi database | `setup.sql`/seed dan bundle 002–003 dilaporkan pengguna telah dijalankan. Dashboard dan RPC yang dipakai dalam seluruh alur di atas berhasil. Migrasi 004 untuk batas hold maksimum 10 menit disiapkan, tidak dijalankan. Seluruh katalog object/fungsi DB belum diperiksa independen. | Alur inti terverifikasi; migrasi 004 menunggu penerapan |

Tes live di atas menulis transaksi persisten ke database bersama. Tidak ada seed/reset yang dijalankan.

## Pemeriksaan integrasi transaksi — 5 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| TypeScript dan ESLint setelah perubahan POS pelanggan | `npm run typecheck` dan `npm run lint` lulus setelah menambahkan customer selector, kompatibilitas schema lama, dan RPC wrapper. | Lulus |
| Production build | `npm run build` lulus; semua route Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibangun setelah perubahan POS. | Lulus |
| Migrasi PostgreSQL | Foundation 93 statement, transaksi 122 statement, POS 29 statement, migrasi 004 tiga statement, dan migrasi 005 lima statement berhasil diparse dengan pglast. Parser tidak mengeksekusi PL/pgSQL atau migrasi di database. | Lulus statis |
| SQL bundles terbaru | `setup.sql` 278 statement dan `apply-transactions.sql` 161 statement berhasil diparse. Bundle incremental mencakup migrasi setelah foundation (002–005), tanpa seed, dan dibungkus transaksi. Perintah generator hanya membentuk file; SQL tidak dijalankan. | Lulus statis |
| Server aplikasi lokal | `GET /login` HTTP 200; `/sales` tanpa sesi HTTP 307 menuju login. Setelah root redirect placeholder dihapus, dashboard `/` berhasil dimuat. | Smoke check lulus |
| Supabase Auth dan REST | `/auth/v1/settings` HTTP 200. REST `profiles` menolak role anon dengan permission denied (akses memang dibatasi); login Owner kemudian berhasil dan query profil/inventory terautentikasi berhasil. | Koneksi dan pembacaan terautentikasi lulus |
| Login, profil, dan hak akses Owner | Dashboard menampilkan profil ber-role Owner. Sesudah koreksi UI, tujuh aplikasi yang ditetapkan PDF tampil dalam empat modul fungsional; Retur bukan app terpisah dan Reporting tertaut dari beranda. Query database menunjukkan 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai stok Rp4.290.000. | Lulus untuk navigasi/data baca Owner; role lain belum diuji |
| Persistensi sesi setelah refresh | Setelah reload dashboard, sesi tetap aktif dan profil Owner tetap terbaca. | Lulus |
| Kompilasi migrasi di database | Percobaan apply pertama gagal saat kompilasi `create_sales_order` karena literal `%` pada pesan batas diskon; sumber diperbaiki menjadi `%%`. Pengguna melaporkan menjalankan bundle incremental, dan RPC dashboard tersedia; eksekusi keseluruhan bundle tidak diverifikasi independen. | Perbaikan dan akses RPC terverifikasi; keseluruhan migrasi belum dikonfirmasi independen |
| SQL bundle sesudah audit | Generator dijalankan dengan opsi `-SqlOnly` (tanpa mengakses database). `setup.sql` dan `apply-transactions.sql` menyertakan migration 004–005; apply bundle tidak boleh dijalankan ke project bersama karena 002–003 telah diterapkan. Kedua migrasi baru belum dijalankan atau divalidasi pada DB. | Lulus parse statis; belum dijalankan pada DB |
| Ringkasan keuangan Owner | RPC `get_owner_dashboard` berhasil dipanggil. AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.000.000; stok 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai Rp4.290.000. | Lulus baca live |
| Modul ERP | Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns terbaca dari Supabase pada pemeriksaan Owner. | Lulus baca live |
| POS customer-link check | Browser Owner membuka `/pos`; customer selector dan C06 terlihat, query receipt dengan kolom `customer_id` sukses, dan tidak ada peringatan migrasi. Aksi mutasi customer belum diuji. | Smoke visual/read lulus; transaksi customer belum diuji |
| T-04 | SO C02 qty 3 CBW-250 ditolak oleh RPC: eksposur Rp319.000 melampaui limit Rp300.000; daftar SO tetap hanya berisi S00001. | Lulus penolakan |
| T-08 | Lead L00001 dengan status Lost tanpa alasan ditolak di server action; status tetap New dan RPC tidak dipanggil. | Lulus validasi action; RPC belum diuji |
| T-10 | Diskon 6% ditolak oleh batas validasi 0–5%; alur approval Owner belum tersedia. | Belum didukung; T-10 tidak lulus |
| T-14 | Transfer 31 CBW-250 dari WH-TBT ditolak karena Available hanya 30. Sesudahnya WH tetap 40 unit/10 reserved/30 available dan CAFE tetap 20 unit/0 reserved/20 available. | Lulus penolakan; saldo tidak berubah |
| T-18 | Penerimaan 21 unit untuk PO00001 ditolak karena melebihi sisa kuantitas PO; PO tetap Rp300.000 dan tidak ada Goods Receipt baru. | Lulus penolakan; saldo tidak berubah |
| Tes transaksi sukses, persistensi stok/jurnal, dan rollback | Alur Sales/Purchase sampai lunas dan efek stok/jurnal live telah diverifikasi; rollback transaksi gagal belum diaudit penuh. | Sukses persistensi teruji untuk dua alur; rollback penuh belum diuji |
| T-01 | Owner, 15 SKU, 2 lokasi, dan stok terverifikasi; sebelum audit jumlah aplikasi 8. | Riwayat sebelum koreksi; status terkini di bawah |
| Pemeriksaan UI setelah koreksi navigasi | Browser Owner menunjukkan tujuh aplikasi, empat kelompok fungsi, 15 SKU/2 lokasi, Reporting di beranda, Retur sebagai tautan capability. Delapan route Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Retur merender judul/form/tabel tanpa pesan error data. Tidak ada mutasi yang dikirim. | Lulus smoke/visual route terbatas; bukan pemeriksaan wireframe penuh |

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
| T-01 | Owner melihat 7 aplikasi, 15 SKU, dan 2 lokasi. | Browser sesudah perubahan menunjukkan tepat 7 app dalam 4 modul; dashboard menampilkan 15 SKU dan 2 lokasi. Tangkapan dashboard dan kartu aplikasi diperiksa; seed lengkap belum ditinjau sebagai fixture bersih. | Lulus baca/navigasi; fixture awal lengkap belum dapat diklaim |
| T-02 | Cashier ditolak membuka jurnal langsung; S00001 tetap ada setelah refresh. | Belum diuji; akun/sesi Cashier tidak tersedia dalam sesi verifikasi. | Belum diuji |
| T-03 | C06 tersimpan COD/limit Rp0; C02 memiliki piutang Rp220.000, limit Rp300.000, ruang Rp80.000. | C02 AR/limit terverifikasi; selector POS menampilkan C06 dengan limit Rp0 dan migration 005 terkonfirmasi pengguna. Profil tersimpan dan receipt customer-linked belum diuji penuh. | Parsial |
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
| T-29 | Hold P00001 sampai 09.10: 2 CBW-250 dan 1 TEH-250 direservasi; total 480 unit, Reserved 13, Available 467; belum ada jurnal. | Belum diuji; UI menetapkan expiry server 10 menit dan pengguna mengonfirmasi migrasi batas DB 004 diterapkan. Tidak ada sesi POS Open di database bersama. | Belum diuji |
| T-30 | Konfirmasi ulang tidak menambah reservasi; order 19 unit ditolak; pembatalan melepas tepat sekali; hold baru expired 09.16 dan dilepas tepat sekali. | Belum diuji; butuh sesi dan fixture terisolasi untuk menguji idempotency, pelepasan, dan expiry tanpa meninggalkan data uji pada DB bersama. | Belum diuji |
| T-31 | Cash Rp39.600 + Bank Rp33.000 melunasi Rp72.600 dengan satu struk; COGS Rp32.000; Kas Rp539.600, Bank Rp10.033.000, laci Rp139.600; stok 477/Rp4.258.000. | Belum diuji; checkout hold dan split tender tidak ditransaksikan, dan hold belum memiliki relasi customer. | Belum diuji |
| T-32 | Tender parsial tidak mengubah saldo/jurnal/stok/struk lunas; pelunasan dan retry menghasilkan satu transaksi; invoice kedua ditolak. | Belum diuji; UI hanya menyelesaikan total tender Cash/Bank penuh; tidak ada sesi POS aktif di database untuk uji. | Belum diuji |
| T-33 | Retur 2 tersegel: Credit Note Rp66.000; AR Rp418.000; stok 474/Rp4.200.000; net COGS Rp90.000; tanpa refund sebelum invoice dibayar. | Belum diuji | Belum diuji |
| T-34 | Retur rusak tidak menambah stok; Credit Note idempoten; 7 tambahan ditolak karena melebihi sisa maksimum 6 unit. | Belum diuji | Belum diuji |
| T-35 | Dashboard periode 20 Okt: net Rp240.000, PBJT Rp24.000, COGS Rp120.000, margin Rp120.000, AR Rp384.000, AP Rp300.000, Bank Rp10.100.000, Kas Rp500.000, stok 472/Rp4.170.000. | Belum diuji | Belum diuji |
| T-36 | Dashboard menelusuri invoice → Delivery/SO/Payment; Cashier tidak dapat membaca jurnal; pengulangan baca tidak mengubah saldo. F-21 ekspor belum dibangun. | Belum diuji | Belum diuji |

T-01 lulus pembacaan dashboard dan hitungan aplikasi setelah koreksi; status seed fixture penuh tetap tidak dapat diklaim karena DB bersama telah berubah. T-04 dan T-14/T-18 memiliki penolakan aktual; T-08 baru memverifikasi penolakan server action, bukan seluruh alur CRM. T-05 adalah pemeriksaan data baca. T-02, T-03 lengkap, T-06–T-07, T-09–T-13, T-15–T-17, T-19–T-36 belum dijalankan sesuai fixture. Keberhasilan baca live dan penolakan transaksi tidak membuktikan alur mutasi sukses, persistensi stok/jurnal, rollback, atau isolasi role. Tes yang memerlukan fixture bersih harus menggunakan project terisolasi; tidak ada transaksi atau seed yang dijalankan pada DB bersama dalam audit terbaru.

## Gap implementasi yang sudah diketahui

Status tes di tabel tetap **Belum diuji**; daftar ini mencatat fitur yang memang belum tersedia penuh agar tidak disalahartikan sebagai sekadar menunggu koneksi:

| Cakupan | Status implementasi |
|---|---|
| T-06 | Ubah harga katalog belum memiliki UI/RPC; snapshot harga Sales Order sudah disimpan. |
| T-10 | Persetujuan Owner untuk diskon di atas 5% belum dibuat; RPC saat ini menolak diskon lebih dari 5%. |
| T-29–T-30 | RPC hold multi-item (UI maksimum dua SKU), reservasi, idempotency, pembatalan, dan expiry tersedia di migrasi 003. UI/action menetapkan 10 menit; migrasi 004 dilaporkan pengguna sudah diterapkan. Pemicu expiry manual; belum ada scheduler dan enforcement/idempotency belum diuji dengan write DB. |
| T-31–T-32 | RPC penyelesaian hold dan split tender Cash/Bank tersedia di migrasi 003; validasi mensyaratkan pelunasan dan replay struk idempoten. Migrasi 005 menambah customer link untuk penjualan langsung saja; partial tender dan cart dengan jumlah baris bebas belum tersedia. Belum diuji pada DB. |
| T-35–T-36 | Dashboard berisi saldo persediaan, piutang, utang, Kas, dan Bank; laporan periode, net sales/COGS/margin, drill-down, dan ekspor belum lengkap. |
| F-21 | Ekspor tetap ditunda sampai kebutuhan Must lulus. |

## Pemeriksaan perubahan keranjang/tabel — 6 November 2026

- TypeScript: PASS.
- ESLint (src, scripts/test-pos-cart.cjs, next.config.ts): PASS.
- node scripts/test-pos-cart.cjs: PASS; 3 SKU diterima, duplikat/field tidak seimbang/jumlah tidak valid ditolak. Ini uji validasi input, bukan T-29/T-30 atau bukti RPC live.
- git diff --check: PASS.
- Production build: BLOCKED oleh EPERM OneDrive dan kegagalan child process Turbopack; belum lulus pada perubahan terbaru.
- Visual/browser dan T-01–T-36: belum dijalankan untuk perubahan ini. Preview pengguna menampilkan ERR_CONNECTION_RESET.

### Pemulihan dan pemeriksaan lanjutan

- Build Webpack menggunakan ERP_VERIFY_BUILD=1: PASS, termasuk route baru /pos/receipt/[number].
- TypeScript dan ESLint src/test runner/config: PASS.
- GET http://127.0.0.1:3000/login: HTTP 200. Browser menampilkan form login aktual; screenshot login diperiksa.
- Kanban, receipt live/print preview, mutasi hold/cart, dan T-01–T-36: belum diuji pada sesi autentikasi baru ini. Tidak ada pengujian transaksi yang menulis database bersama.

## UI/UX workspace — 6 November 2026

Uji pada komponen sebenarnya melalui harness sementara dengan data contoh, tanpa koneksi Supabase:
- Buka form Pesanan baru: PASS.
- Escape menutup dialog dan fokus kembali ke pembuka: PASS.
- Pencarian S00002 menyaring 2 menjadi 1: PASS.
- Tab Delivery lewat klik lalu Sales Order lewat Left: PASS.
- Menu Filter & Group By terbuka: PASS.
- Status Partial Delivery menyaring 2 menjadi 1: PASS.
- Reset mengembalikan 2 hasil: PASS.
- Screenshot desktop/form dan viewport 390x844 diperiksa; viewport direset.
- Harness dan launcher sementara dihapus setelah uji, server uji dihentikan.
- Bukan pengujian mutasi database atau fixture T-01–T-36. Pemeriksaan live Owner/role lainnya masih perlu.
