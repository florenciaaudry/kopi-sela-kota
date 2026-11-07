# Test Results

T-01–T-36 belum dijalankan penuh sesuai fixture PDF. PDF sumber asli terbaca 43 halaman; matriks `docs/requirements-traceability.md` mencatat halaman, implementasi, tes, status, dan gap. Pada 5 Nov 2026 login Owner/dashboard serta satu siklus Sales/Purchase sampai lunas berhasil diuji live; transaksi itu persisten di database bersama. Pada 6 Nov pengguna mengonfirmasi migrasi 004–005 berhasil diterapkan; query halaman POS terautentikasi membaca kolom customer pada receipt tanpa error skema. Tidak ada seed, migrasi, atau transaksi POS baru yang dijalankan dalam pemeriksaan ini.

## Hasil terbaru yang menggantikan snapshot awal — 6 Nov 2026

| Pemeriksaan | Hasil aktual | Batas klaim |
|---|---|---|
| Migrasi database | 004–006 dan 008–009 diterapkan/dikonfirmasi pada project bersama. Migrasi 007 retired/no-op sebelum deployment dan tidak menulis ulang CP00004 atau jurnal historis. | Jangan menjalankan `setup.sql`, seed, atau bundle 002–009 pada project bersama. |
| Login/akses role | `docs/role-test-results.json`: 120 PASS, 0 FAIL, termasuk login, profil, identitas tokoh, akses route, RLS, penolakan aksi lintas-role, logout, dan redirect. | Tidak menguji setiap transaksi bisnis lewat browser untuk semua role. |
| Regresi transaksi | CRM/Sales, pengiriman parsial/berlebih, invoice, partial/overpayment, POS sesi tertutup/tender tidak lengkap/mixed-tender/replay, dan direct BANK sale lulus melalui RPC di transaksi rollback. | Bukan fixture PDF bersih; tidak sama dengan T-01–T-36 penuh. Stok, jumlah sales, dan jurnal tidak berubah setelah rollback. |
| POS customer link | Selector C01–C06 dan query `pos_receipts.customer_id` lulus baca; migrasi 005 tersedia. | Posting receipt yang terhubung ke customer belum diuji terpisah. Cashier POS sukses end-to-end lewat browser juga belum diuji. |
| POS hold/receipt detail | Migrasi 008/009 aktif; hold completion/tender dan direct-sale detail memiliki regresi rollback, detail struk dapat dibaca/cetak dari UI. Backfill baris/tender receipt lama diverifikasi terhadap jurnal dengan audit repair. | Expiry tepat waktu pada fixture PDF dan alur browser Cashier masih belum diverifikasi. |
| UI, build, dan role | Beranda/app directory role-aware, navigasi, CRM Kanban, tabel/search/filter, dialog, Returns, dan mobile memiliki hasil smoke/visual di catatan progres. Build Webpack, typecheck, lint, test kebijakan, dan test keranjang tercatat lulus pada perubahan UI/role terbaru. | Belum inspeksi seluruh state/field wireframe dan belum sertifikasi produksi. |
| Pemeriksaan ulang workspace | `npm run typecheck`, `npm run lint`, `npm run test:pos-cart`, `npm run test:rupiah-format`, `npm run test:role-policy`, serta `ERP_VERIFY_BUILD=1 npm run build` lulus pada 6 Nov 2026. Output build terpisah di `.next-check`. PDF panduan diekspor, berjumlah 8 halaman, teks dan pengecualian kredensial diperiksa; cover, isi, dan halaman akhir dilihat di browser. | Lulus; dokumentasi/build bukan pengganti tes bisnis PDF. |
| Fixture PDF | T-01–T-36 belum seluruhnya dijalankan dengan fixture bersih. | Project bersama sudah berisi transaksi uji persisten dan bukan seed awal; gunakan Supabase terisolasi untuk tes berikutnya. |

## Snapshot POS baca/visual — 6 Nov 2026 (tahap sebelum regresi SQL terbaru)

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
| Migrasi database | Snapshot 5 Nov: `setup.sql`/seed dan bundle 002–003 dilaporkan dijalankan; migrasi 004 masih menunggu. Status aktual terbaru 6 Nov ada pada tabel pembaruan di awal dokumen: 004–006/008–009 diterapkan/dikonfirmasi, 007 retired/no-op. | Snapshot historis; status terbaru ada di atas |

Tes live di atas menulis transaksi persisten ke database bersama. Tidak ada seed/reset yang dijalankan.

## Pemeriksaan integrasi transaksi — 5 Nov 2026

| Pemeriksaan | Hasil aktual | Status |
|---|---|---|
| TypeScript dan ESLint setelah perubahan POS pelanggan | `npm run typecheck` dan `npm run lint` lulus setelah menambahkan customer selector, kompatibilitas schema lama, dan RPC wrapper. | Lulus |
| Production build | `npm run build` lulus; semua route Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibangun setelah perubahan POS. | Lulus |
| Migrasi PostgreSQL | Foundation 93 statement, transaksi 122 statement, POS 29 statement, migrasi 004 tiga statement, dan migrasi 005 lima statement berhasil diparse dengan pglast. Parser tidak mengeksekusi PL/pgSQL atau migrasi di database. | Lulus statis |
| SQL bundles pada snapshot 5 Nov | `setup.sql` 278 statement dan `apply-transactions.sql` 161 statement berhasil diparse saat bundle masih mencakup 002–005. Bundle terbaru kemudian dibangun ulang sampai 009; 007 retired/no-op. | Lulus statis saat snapshot; bundle terbaru tidak boleh dijalankan di DB bersama |
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
| T-29 | Hold P00001 sampai 09.10: 2 CBW-250 dan 1 TEH-250 direservasi; total 480 unit, Reserved 13, Available 467; belum ada jurnal. | RPC hold/completion diuji pada regresi rollback, tetapi angka fixture, expiry 10 menit tepat, dan pelepasan expiry sesuai T-29 belum diuji. | Fixture belum diuji |
| T-30 | Konfirmasi ulang tidak menambah reservasi; order 19 unit ditolak; pembatalan melepas tepat sekali; hold baru expired 09.16 dan dilepas tepat sekali. | Replay hold diuji sebagian dalam regresi rollback; fixture jumlah/expiry/pembatalan tepat waktu dan jam expiry belum diuji. | Fixture belum diuji |
| T-31 | Cash Rp39.600 + Bank Rp33.000 melunasi Rp72.600 dengan satu struk; COGS Rp32.000; Kas Rp539.600, Bank Rp10.033.000, laci Rp139.600; stok 477/Rp4.258.000. | Mixed-tender POS hold dan jurnal seimbang diuji lewat RPC rollback; nilai, sesi Cashier, refresh, dan saldo fixture T-31 belum diuji end-to-end di browser. | Fixture/browser belum diuji |
| T-32 | Tender parsial tidak mengubah saldo/jurnal/stok/struk lunas; pelunasan dan retry menghasilkan satu transaksi; invoice kedua ditolak. | Tender tidak lengkap ditolak tanpa efek dan replay diuji melalui rollback; seluruh assertion PDF, retry browser, dan invoice kedua belum diuji. | Fixture/browser belum diuji |
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
| T-29–T-30 | RPC hold multi-item, reservasi, idempotency, pembatalan, dan expiry tersedia; UI mendukung jumlah baris dinamis dan server menentukan expiry 10 menit (migration 004). Regresi RPC rollback mencakup completion/replay, tetapi expiry/cancel dengan jam fixture belum diuji. Pelepasan expired dipicu RPC/UI; belum ada scheduler otomatis. |
| T-31–T-32 | RPC completion/split tender Cash/Bank (migration 008) dan detail receipt direct sale (migration 009) diterapkan. Regresi rollback menguji hold mixed tender, tender tidak lengkap, replay, dan direct BANK sale. Tidak ada alur tender parsial persisten; linked customer receipt dan Cashier sukses end-to-end lewat browser belum dibuktikan. Fixture T-31/T-32 belum lulus. |
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

## Audit role dan prasyarat login — 6 November 2026

- SQL audit profil/Auth: owner=1 profil, 1 akun Auth, 1 terkonfirmasi; role lain belum tersedia.
- Migrasi 006: PASS setelah izin eksplisit pengguna; hasil read-back finance_owner_guard=true, current_profiles=1. Tidak ada transaksi bisnis diposting.
- test:role-policy: PASS (matriks enam role, tujuh menu, pembatasan Credit Note action).
- Build/TypeScript/ESLint: PASS pada perubahan aplikasi role.
- test:roles: BLOCKED sebelum login, file akun uji belum tersedia. Bukan hasil gagal otorisasi; pengujian login/URL/RLS/logout belum dijalankan.
- roles:setup belum dieksekusi; memerlukan input key admin di terminal lokal.

## Hasil login dan akses role aktual — 6 November 2026

- Akun uji keenam role berhasil dibuat pengguna lewat roles:complete; Owner asli tidak diubah.
- Laporan awal 82 PASS/20 FAIL mengandung false positive parser: string not-found ikut pada template script di halaman yang sah. Diperbaiki dengan pemeriksaan HTML h1 aktual, error data, dan digest penolakan 403/404; regression test lulus.
- Satu pengulangan mengalami timeout Owner dan pengulangan lain timeout Procurement/Inventory. Histori disimpan terpisah; retry hanya untuk exception jaringan, bukan hasil izin yang salah.
- Eksekusi akhir: 114 PASS, 0 FAIL. Login/profil keenam role, 48 akses URL, RLS jurnal/akun/biaya, larangan mengubah profil/biaya langsung, larangan insert jurnal langsung, RPC lintas-role, logout dan redirect diperiksa nyata.
- Laporan utama: docs/role-test-results.json. Histori: role-test-results-before-parser-fix.json, role-test-results-owner-transient.json, role-test-results-network-timeout.json. Tidak ada password/token pada laporan.
- Tidak mem-posting transaksi bisnis. Cakupan ini tidak membuktikan semua workflow transaksi, tombol UI, atau T-01–T-36.

## Review teman dan regresi ulang 6 November 2026

- Versi teman 77ca12e disinkronkan; review awal b117a98 sudah di main. Koreksi angka laporan sintetis dan jalur checkout POS nonatomik dihapus.
- Tes akses keenam role diulang pada versi terkini: 114 PASS, 0 FAIL, termasuk 19 pemeriksaan Sales. Ini bukan penyelesaian seluruh tugas anggota 1.
- Migrasi 007 yang menimpa pembayaran/jurnal historis dinonaktifkan. CP00004 tetap Rp330 sampai nominal yang dimaksud dikonfirmasi.
- Migrasi 008 diperketat dan fungsi complete_pos_hold dipasang pada database aktif. MD5 badan fungsi setelah whitespace diabaikan cocok dengan file lokal: bf051c46b6a0942d294dcda30a913379. Tidak ada perluasan hold 24 jam.
- Regresi CRM, Sales, partial delivery, invoice dan partial payment/overpayment serta mixed-tender POS lulus melalui RPC SQL Editor. Pertama QA Owner, lalu klaim Sales/Warehouse/Finance untuk alur terkait; POS QA Owner. Semua perubahan dokumen uji rollback; jumlah stok, SO dan jurnal tetap. Sequence bisa melompat.
- Percobaan pertama menemukan nama receipt_number ambigu pada guard replay baru; diperbaiki dan pengulangan lulus. Hasil final: docs/review-regression-results.json. Script reproduksi: scripts/verify-review-rollback.sql (cakupan saat ini, bukan baseline PDF).
- Login Sales dan pemilihan dropdown pelanggan di browser berhasil; formulir ditutup tanpa mencatat transaksi. Fitur Quotation, approval diskon >5%, Contacts dan gap PDF lainnya belum lengkap. Status rinci: docs/status-anggota-1.md.
- Tambahan final: migrasi 009 dipasang. Trigger mengisi detail baris/tender penjualan langsung secara atomik; backfill POSR00001 (Rp38.500) dan POSR00002 (Rp35.200) diverifikasi terhadap jurnal posted dan masing-masing menghasilkan satu audit perbaikan. Tidak mengubah saldo, stok, waktu atau jurnal. HOLD/00001 tetap Expired karena struk lama dijual sesudah expiry.
- Regresi setelah 009: empat kelompok uji CRM/Sales/payment/POS termasuk direct BANK sale dan replay lulus; error=null, stock_unchanged=true, sales_count_unchanged=true, journal_count_unchanged=true. T-01–T-36 dan fitur PDF yang belum dibuat tetap belum selesai.

## Pemeriksaan pintasan role, tanggal Purchase dan bukti audit — 6 November 2026

- `npm run typecheck`, `npm run lint`, `npm run test:pos-cart`, `npm run test:rupiah-format`, `npm run test:role-policy`, dan production build Webpack terisolasi lulus setelah perubahan UI.
- Build menghasilkan seluruh route aplikasi. Pemeriksaan HTTP ke server verifikasi berhasil, tetapi membuka `/purchase` dialihkan ke `/login?session=expired`; snapshot browser sebelumnya adalah halaman lama/stale. Karena itu tampilan route Purchase/POS pascaperubahan belum dihitung sebagai verifikasi visual. Build terbaru tersedia pada preview port 3001 (PID 15660) untuk diperiksa setelah login.
- Tidak mem-posting transaksi, seed, reset, atau menjalankan migrasi pada Supabase bersama. Bukti audit yang ditampilkan berasal dari event yang memang sudah tersedia; tampilan event nyata dan role behavior masih perlu diverifikasi dengan sesi role/fixture uji yang sah.
- T-01–T-36 tetap belum selesai. Pemeriksaan tipe/lint/build dan tes lokal tidak menggantikan skenario transaksi fixture.


## Owner: Users & Permissions dan Audit Log - 6 November 2026

- /settings dan /audit dijaga requireRole([owner]) di server; menu hanya Owner. Jumlah aplikasi tetap tujuh; Settings bukan role baru atau app tambahan.
- Users menampilkan profil aktual dan matriks akses aplikasi. Ini baca-saja: pembuatan akun, undangan dan perubahan role belum tersedia dari UI. Tidak memakai key admin pada server aplikasi dan tidak memperluas permission database.
- Audit Log membaca audit_events dengan RLS yang sudah ada: pelaku historis, waktu WIB, tindakan dan referensi. Filter dokumen/tindakan/rentang WIB di server; pagination 50 baris. Detail JSON mentah tidak ditampilkan. Nama actor historis tetap dipertahankan.
- 132 PASS / 0 FAIL untuk enam role, termasuk dua URL tambahan: hanya Owner diterima; lima role lain ditolak. Ini bukan 36 tes bisnis. Typecheck, lint awal, kebijakan role dan build produksi terisolasi lulus.
- Browser: 7 profil, 6 role pada matriks, 27 audit events aktual; pencarian PO00002 menghasilkan 1 event; tanggal mulai sesudah akhir ditolak dengan panduan koreksi. Lebar halaman Settings 375 pada viewport 390, tidak melebar ke luar.
- Pesan error modul menyimpan rincian di log server dan menampilkan pemulihan ringkas kepada pengguna. Peringatan layanan yang tidak tersedia tetap ditampilkan; bukan menyembunyikan masalah.
- PDF gabungan diperbarui menjadi v1.1, enam halaman, dengan panduan pengguna, cakupan 132 pemeriksaan dan susunan video progres. Layout semua halaman dirender dan diperiksa.
- Seluruh perubahan agent sebelumnya dipertahankan. Tidak ada migrasi, seed, reset atau posting transaksi usaha pada pekerjaan ini. Gap Quotation/RFQ, approval diskon, inspeksi retur, Reporting lengkap dan T-01-T-36 tetap terbuka.


## Kesiapan video dan Reporting - 7 November 2026

- Reporting baru menghitung Net Sales, PBJT, COGS, Margin, AR/AP, Cash, Bank dan Inventory Value dari jurnal posted. KPI periode terpisah dari saldo akhir termasuk opening balance. Sumber jurnal dapat dibuka; invoice mengarah ke detail dan Sales Order tersaring untuk Owner. Finance tetap tidak memperoleh akses baru ke Sales.
- Unit arithmetic memakai angka T-35 dan pembalikan Credit Note; semua kontribusi drill-down cocok total. Ini bukan pengujian seluruh fixture SQL T-35.
- Latihan API lintas role benar-benar diposting: S00007 -> DN00007 -> INV00013 -> CP00014; PO00003 -> GR00002 -> BILL00003 -> VP00004; POS/00004, HOLD/00006, POSR00008 mixed Cash/Bank dan POSR00009 C06. Delapan jurnal seimbang, audit sesuai role, sesi Closed tanpa selisih. Dokumen permanen; before/after dicatat di video-rehearsal-results.json.
- Form browser Owner juga diuji sukses: S00008 -> DN00008 -> INV00015 -> CP00016; PO00004 -> GR00003 -> BILL00005 -> VP00006. Invoice dan bill lunas; enam jurnal seimbang; Bank +18000, Cash/AR/AP/stok/nilai persediaan kembali sama dengan sebelum kedua alur UI. Bukti read-only: video-browser-results.json.
- Migrasi 010 diterapkan di project Supabase yang sama: invoice parsial mempertahankan Partial Delivery saat ada sisa barang. Regresi delivery kedua dan invoice kedua lulus; seluruh transaksi tes rollback. stock_unchanged dan document_counts_unchanged true. Role/ACL dan RLS tetap; bukan seed/reset. Bukti: migration-010-regression.json.
- UI Purchase: salah label Diterima=Receipt Date dan Sisa=Amount Due untuk kuantitas diperbaiki ke Accepted/Remaining Quantity. Vendor/Product memakai Inggris. Form Vendor Bill hanya menawarkan kuantitas diterima yang belum ditagih; PO lunas tidak terus ditawarkan.
- Struk tidak lagi mengarang rincian dari rata-rata subtotal. Printing diblokir bila baris/tender hilang, jumlah/tax/total tidak cocok, atau nilai negatif. Receipt nyata C06 terbaca nama pelanggan/produk dan Bank 6600.
- Uji role terakhir: 156 PASS, 0 FAIL, termasuk 12 URL per role dan RLS detail SO/PO. Test reporting, receipt integrity, kebijakan role, lint, typecheck dan build lulus. Indikator developer disembunyikan untuk preview; error aplikasi tetap terlihat.
- PDF tunggal v1.2, 6 halaman, diperbarui dan seluruh halaman dirender/diperiksa. Panduan memuat lima unsur wajib video, durasi 9:30, YouTube Unlisted dan pengumpulan Moodle sesuai pengumuman.
- Batas: hanya alur di atas telah diverifikasi. Quotation/RFQ, approval diskon, inspeksi retur, pengelolaan master/account dari UI, customer Hold dan expiry fixture/scheduler, Log Notes/relasi penuh, seluruh T-01-T-36 dan deployment publik belum lengkap. Jangan menyatakan seluruh PDF/produksi selesai.


## Penyelesaian POS untuk video - 7 November 2026

- Cashier Maya menjalani login browser, membuka POS/00005, menjual TEH-250 C06 via Bank pada POSR00012, kemudian Close dengan Counted Cash 100000 / difference 0. UI hanya memilih sesi milik akun sendiri; Owner yang mempunyai sesi lain tidak menutupi pembukaan Cashier. Verifikasi sumber: video-pos-browser-results.json.
- Migrasi 011 menolak direct MIXED tanpa rincian tender; split Cash/Bank tetap lewat Checkout Hold atomik. Migrasi 012 mengecualikan Hold kedaluwarsa dari Available segera dan menjadwalkan cleanup/audit tiap menit via pg_cron. Fungsi housekeeping tidak dapat dieksekusi langsung oleh authenticated/anon. Migrasi 013 mempertahankan Customer dari Hold sampai Receipt dan memperbaiki benturan variabel pada replay Hold.
- Ketiganya telah diterapkan pada proyek tswkkutgqayvxwzepqfs. Regresi terpadu migration-013-regression.json: 9 kelompok checks PASS, stock_unchanged=true, document_counts_unchanged=true. Skenario uji bisnis rollback; hanya fungsi/kolom/job yang dipertahankan. Ini bukan T-01-T-36 fixture bersih.
- Form browser Owner: HOLD/00017 Customer C06, satu TEH-250, Checkout Cash 3300 + Bank 3300 -> POSR00022. Satu struk/jurnal, PBJT 600, stok berkurang 1, Expected Cash sesi bertambah 3300. Dokumen rehearsal ini permanen; bukan reset baseline.
- CRM menampilkan Weighted Revenue dari Expected Revenue dan Probability. Reporting dan struk tetap memakai data nyata; tampilan tidak beralih diam-diam ke demo.
- Cakupan video: overview, konfigurasi/master terbaca, Sales -> Delivery -> Invoice -> Payment, Purchase -> Receipt -> Bill -> Payment, POS -> stock/journal, Reporting/Audit, serta progres/kendala. Semua transaksi yang disebut di atas memiliki bukti aktual. Rekaman/upload YouTube/Moodle tetap perlu dilakukan kelompok.
- Belum lengkap untuk final seluruh PDF: lifecycle Quotation/RFQ; master CRUD; approval diskon >5%; inspeksi retur terpisah; Log Notes/relasi semua dokumen; user management tulis; seluruh fixture T-01-T-36; deployment publik. Jangan menyebut aplikasi 100% atau siap produksi.


### Verifikasi akhir paket video (7 November 2026)

- Job expiry aktif; 319 eksekusi scheduler berhasil dan 0 gagal saat pemeriksaan. Tidak ada hak EXECUTE langsung untuk anon/authenticated. Bukti expiry-scheduler-results.json.
- Pengujian akses ulang setelah migrasi 012/013: 156 PASS / 0 FAIL. Verifier read-only Sales/Purchase, Cashier dan Hold browser seluruhnya PASS.
- PDF v1.3 enam halaman dirender dan diperiksa seluruhnya; memuat panduan transaksi dan kelima unsur video dosen. Dokumen tidak mengklaim seluruh ERP lengkap.


## Navigasi atas dan Demo Login Accounts — 7 November 2026

- Sidebar dihapus dari shell; satu Apps switcher pada topbar menampilkan menu sesuai role. Area kerja memakai lebar penuh. Breadcrumb, nama, role dan Logout tetap tersedia. Mobile menggunakan menu yang sama, bukan daftar izin terpisah.
- CRM default List, Kanban tetap tersedia. Ringkasan Leads, Open Opportunities, Expected Revenue (tanpa Lost), dan Weighted Revenue peluang terbuka menampilkan nilai dari data aktual. Angka tidak meniru nominal pada foto referensi.
- Halaman /login menampilkan enam kartu role + nama tokoh PDF. Pilih kartu untuk autentikasi Supabase nyata dengan QA account yang sudah ada; profil/id diperiksa setelah sign-in. Tidak membuat akun baru, mengubah password, role, RLS, migrasi, atau transaksi usaha.
- Shortcut hanya development dengan hostname loopback, origin sama untuk action, dan file .env.role-accounts.local yang cocok dengan proyek. Password dibaca hanya di server; tidak dimasukkan ke HTML/props/bundle klien. Production menonaktifkan shortcut dan tetap meminta login biasa. Ini akun uji pada database bersama, bukan simulasi localStorage.
- Uji HTTP native-form Server Actions: keenam role masuk dan identitas benar; enam kartu tampil; password tidak ada dalam HTML; Host eksternal tidak menampilkan shortcut. Production build tidak menampilkan shortcut; /pos anonim tetap redirect login. Bukti: quick-login-results.json. npm run test:quick-login dapat mengulang pengujian di preview development 3000 tanpa transaksi usaha.
- Typecheck, lint, role-policy dan production build lulus. Pemeriksaan visual otomatis belum dapat diselesaikan: Browser Use tidak tersedia, dan Windows Computer Use menghentikan akses karena tidak dapat memverifikasi URL browser. Jangan menganggap seluruh viewport/state sudah diperiksa visual.
- Preview aktif pada http://127.0.0.1:3000/login. Akun lengkap tersedia hanya di laptop yang memiliki file lokal akun uji tersebut; file kredensial tidak ikut Git. Pada laptop lain siapkan file akun secara privat atau gunakan login biasa.


## Dokumen dapat dibuka dan menjalankan aksi — 7 November 2026

- Memperbaiki daftar teks pasif: nomor SO/PO/Delivery/Receipt/Bill/Payment/Credit Note/Transfer/Journal/Hold/Session, Product dan Contact kini memiliki detail berotorisasi. List dan Kanban CRM membuka Opportunity. Accounting KPI menuju Reporting; jurnal dan Audit menuju sumber yang sesuai.
- Detail memakai baris nyata, kuantitas sumber, status, smart buttons, hubungan dokumen dan History Owner. Form tindakan dipasang berdasarkan role/status/sisa kuantitas/tagihan; bukan tombol hias. Detail terposting tetap terkunci. Cashier hanya melihat history Hold/Receipt sendiri pada daftar, dengan detail Session/Hold milik sendiri diperiksa di server; tidak ada klaim RLS baru.
- Customer exposure/terms tampil; C02 NET7, limit 300000 dan exposure 220000 diverifikasi. URL nomor bergaris miring diperbaiki. Opening AR/AP dapat dibuka; vendor payment tidak salah menuju customer invoice.
- 192 pemeriksaan detail/link/role lulus, 0 gagal, 2 jenis tanpa record aktual ditandai NOT_TESTED. Penolakan Lost tanpa alasan dan overpayment melalui form detail lulus tanpa perubahan data. Lihat document-details-results.json, document-actions-results.json dan interaction-audit.md.
- Verifier Sales/Purchase, Cashier dan Hold tetap PASS setelah perubahan. Tidak menjalankan migrasi, seed/reset, atau posting sukses baru. Seluruh PDF/T-01–T-36 belum lengkap; gap terperinci tetap dicatat.
