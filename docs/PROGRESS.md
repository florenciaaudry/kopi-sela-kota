# Progress

## Landasan proyek

- [x] Menelaah PDF spesifikasi 43 halaman, termasuk SR-01–SR-20, F-01–F-21, wireframe, dataset, dan T-01–T-36.
- [x] Mencatat konflik kebutuhan dan keputusan baseline di [Decision Log](./decision-log.md).
- [x] Menyusun dokumentasi arsitektur, matriks keterlacakan, pemetaan dataset, test results, defect log, pengungkapan AI, serta dokumen tim draf.
- [x] Menyiapkan migrasi pondasi, seed baseline, autentikasi Supabase, RLS baca, role Owner/staf, dan halaman login.
- [x] Mempertahankan mode demo lokal berlabel jelas hanya jika Supabase sama sekali belum dikonfigurasi; error konfigurasi/database tidak dialihkan ke demo.

## Integrasi transaksi

- [x] Membuat migrasi transaksi bertahap `202611050002_transactions.sql` dengan RPC untuk Sales Order, Delivery, Invoice, pembayaran, PO, Receipt, Vendor Bill, transfer, sesi/penjualan POS sederhana, Credit Note, CRM, audit, serta ringkasan Owner/Finance.
- [x] Menambahkan workflow POS multi-item: hold, reservasi, pembatalan, expiry, penyelesaian, split tender, detail struk, dan jurnal.
- [x] Menghitung expiry hold di database; UI/server action menetapkan tepat 10 menit dan tidak menerima durasi dari browser. Pengguna mengonfirmasi migrasi 004 sudah diterapkan; belum ada transaksi hold live untuk menguji enforcement end-to-end.
- [x] Menambahkan kontrol role di server action dan database; mutasi tabel tetap ditutup untuk browser dan dilakukan melalui RPC `SECURITY DEFINER`.
- [x] Mengunci idempotency key untuk operasi penting, memeriksa replay dengan payload berbeda, menjaga konsistensi stok dan jurnal dalam satu transaksi, serta memperbaiki urutan lock transfer dan penanganan baris jurnal nol.
- [x] Menghubungkan halaman Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns ke query Supabase dan RPC; tidak memakai localStorage/fixture saat konfigurasi Supabase aktif.
- [x] Menambahkan pilihan pelanggan opsional pada penjualan POS langsung lunas, penyimpanan customer pada struk, dan pemeriksaan konsistensi customer saat replay idempotency; jalur ini tidak membuat piutang atau melonggarkan limit kredit.
- [x] Mengubah generator SQL agar membuat bundle fresh-project [`setup.sql`](../supabase/setup.sql) dan bundle migrasi incremental [`apply-transactions.sql`](../supabase/apply-transactions.sql).
- [x] Menjalankan TypeScript, ESLint, production build, dan parse semua migrasi/bundle setelah audit navigasi, batas hold, dan customer-link POS; hasil aktual dicatat di [Test Results](./test-results.md).

## Audit spesifikasi dan penyempurnaan

- [x] Memeriksa PDF sumber asli yang terbaca lengkap 43 halaman, termasuk dataset, catatan fixture, wireframe, SR-01–SR-20, F-01–F-21, T-01–T-36, ketentuan penyerahan, rubrik, dan refleksi.
- [x] Mengganti matriks stale dengan keterlacakan yang mencatat halaman PDF, file, tes, status bukti, dan gap untuk SR/F/S/T serta paket penyerahan.
- [x] Memperbaiki jumlah navigasi dari 8 app menjadi 7 dan mengelompokkan kartu Home menjadi 4 modul fungsional. Reporting ditempatkan di Home; Retur ditempatkan sebagai kemampuan lintas Inventory/Invoicing, bukan app tambahan.
- [x] Menyelaraskan akses layar/aksi Retur ke peran Warehouse, Finance, dan Owner sesuai wireframe S-17.
- [x] Memperbaiki masa hold POS pada UI/action agar server menentukan 10 menit; menyiapkan migrasi incremental untuk menolak hold baru di atas 10 menit pada database.
- [x] Menambahkan pelanggan opsional untuk penjualan POS langsung lunas, dengan tautan idempoten pada struk. Pengguna mengonfirmasi migrasi 005 sudah diterapkan; query POS terautentikasi berhasil membaca kolom customer_id dan daftar customer.
- [x] Mengulang pemeriksaan visual desktop dan viewport 390px pada dashboard serta seluruh route ERP. Setelah menemukan navigasi aplikasi/workspace terpotong di layar sempit, CSS diubah agar tautan membungkus beberapa baris; pemeriksaan ulang POS menunjukkan seluruh tautan terlihat dan tidak ada overflow horizontal. Typecheck, lint, dan production build kembali lulus.

## Status Supabase dan Owner

- [x] `.env.local` memakai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `.gitignore` mengabaikan `.env.*` kecuali `.env.example`.
- [x] Pengguna melaporkan telah menjalankan setup foundation, membuat user Auth Owner, dan menyiapkan profil sesuai konfirmasi sebelumnya.
- [x] Endpoint Auth project merespons HTTP 200; endpoint REST mengenali project/schema profil dan menolak akses anonim sesuai grant; server lokal membaca `.env.local`; `/login` merespons HTTP 200 dan route ERP mengarahkan sesi anonim ke login.
- [x] Login aktual Owner berhasil; nama profil dan role Owner terbaca, dashboard dan aplikasi sesuai role dimuat, serta sesi bertahan setelah refresh. Password tidak diminta atau disimpan di chat.
- [x] Query terautentikasi untuk produk, lokasi, dan stok berhasil menampilkan 15 SKU, 2 lokasi, dan 480 unit dari Supabase.
- [x] Percobaan awal gagal pada `RAISE` di `create_sales_order`; persen literal dikoreksi menjadi `%%` dan semua `RAISE` di migrasi 001–003 diaudit.
- [x] Dashboard Owner berhasil memanggil `get_owner_dashboard`: AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.000.000; stok 15 SKU, 2 lokasi, 480 unit, 10 reserved/470 available, nilai Rp4.290.000.
- [x] Modul Sales, CRM, Purchase, Inventory, Accounting, Invoicing, POS, dan Returns berhasil dibaca dari Supabase. Data baseline Sales S00001, Lead L00001, PO00001, POS/00001 dan opening journal tampil.
- [x] Pengguna melaporkan migrasi 002–003 terdahulu dan kini mengonfirmasi migrasi 004–005 berhasil diterapkan. Query POS Owner menampilkan selector C06 dan berhasil memilih kolom `pos_receipts.customer_id` tanpa peringatan skema. Bundle [`apply-transactions.sql`](../supabase/apply-transactions.sql) mencakup 002–005; jangan jalankan bundle penuh, seed, atau migrasi lama di DB bersama.
- [x] Verifikasi ulang login Owner dan dashboard; sesi Owner bertahan setelah reload.
- [x] Alur Sales live: S00002 → DN00001 → INV00001 → CP00002, C05, 1 CBW-250, invoice Rp33.000 lunas via Bank. Stok turun 1 saat delivery; jurnal delivery, invoice, dan pembayaran seimbang.
- [x] Alur Purchase live: PO00002 → GR00001 → BILL00001 → VP00002, V01, 1 CBW-250 seharga Rp15.000, lunas via Bank. Receipt menaikkan stok 1; jurnal receipt, bill, dan pembayaran seimbang.
- [x] Sesudah kedua alur, dashboard menunjukkan stok kembali ke baseline 480 unit (10 reserved/470 available), nilai Rp4.290.000; AR Rp220.000, AP Rp300.000, Kas Rp500.000, Bank Rp10.018.000. Opening AR/AP tidak berubah.
- [x] Catatan instalasi laptop baru dan kondisi handoff dibuat di [Panduan Handoff](./handoff.md); README yang sebelumnya stale diperbarui.
- [x] Mempertahankan penolakan SO Sales untuk C06 (COD, limit Rp0) saat belum dibayar. Jalur penjualan POS langsung lunas kini dapat mengaitkan pelanggan pada struk, tanpa membuat piutang; schema/selector terverifikasi baca-saja, tetapi transaksi struk belum diposting.
- [ ] T-01–T-36 belum dijalankan penuh. Hasil aktual: T-04 penolakan limit kredit diuji lewat RPC; T-08 Lost tanpa alasan ditolak di server action; T-14 transfer melebihi Available ditolak; T-18 penerimaan melebihi sisa PO ditolak. T-10 belum dapat dipenuhi karena approval diskon >5% belum tersedia.
- [ ] Tes sukses yang tercatat di atas menulis data persisten pada Supabase bersama atas permintaan pengguna. Jangan ulangi seed, reset, atau hapus transaksi; alur sukses lain harus diuji di project/fixture terisolasi atau dengan persetujuan yang sesuai.

## Sisa pekerjaan / batas verifikasi

- Modul POS memiliki RPC hold multi-item, expiry/cancel, split tender, dan penyelesaian; workflow belum diuji lewat transaksi nyata. Pengguna mengonfirmasi migrasi 004/005, dan UI membuktikan schema customer link terbaca. Hold checkout belum mencatat customer. POS/00001 berstatus Opening Control, bukan sesi Open, dan saat pemeriksaan tidak ada hold aktif; checkout belum diuji agar tidak menambah receipt/jurnal permanen ke database bersama. Expiry dihitung server, tetapi pelepasan status kedaluwarsa dipicu manual melalui RPC/UI; tidak ada scheduler otomatis.
- UI hold POS sekarang mendukung tambah/hapus baris sampai jumlah SKU katalog, estimasi subtotal/PBJT, dan validasi server. Transaksi live keranjang baru belum diuji.
- Kontak pelanggan tidak memiliki halaman Form untuk termin/limit/eksposur; pengaitan pelanggan pada checkout hold belum dibuat.
- Pengeditan katalog/harga, approval diskon Owner >5–10%, laporan periode/drill-down, smart button/Log Notes, dan fitur ekspor F-21 belum lengkap.
- Tampilan List/Kanban/Form serta Search/Filters/Group By belum konsisten di semua modul; kebanyakan halaman transaksi masih form dan tabel.
- T-01–T-36 belum dijalankan penuh terhadap database. Build dan parse SQL bukan bukti transaksi nyata; beberapa penolakan telah diuji langsung melalui aplikasi/database dan dicatat terpisah.
- Tes tersisa perlu memakai fixture PDF yang bersih dan role/akun yang sesuai. Transaksi sukses mengubah data permanen; jangan menandai tes yang belum dijalankan sebagai lulus atau reset project aktif.

## Langkah manual minimum

1. Migrasi 004 dan 005 telah dilaporkan berhasil dijalankan pada Supabase bersama; jangan jalankan ulang. Untuk transaksi POS sukses, gunakan project uji terisolasi atau sepakati dahulu transaksi uji persisten pada database bersama.
2. Laptop baru mengikuti [Panduan Handoff](./handoff.md). Jangan menjalankan SQL/seed pada project bersama yang sudah dipakai.
3. Tes role selain Owner memerlukan akun/profil uji role terkait. Sisa tes mutasi sebaiknya dilakukan pada project uji terisolasi agar saldo baseline bersama tidak tercampur.

## Checkpoint sesi — 6 Nov 2026

- Migrasi 004 (batas hold 10 menit) dan 005 (customer link pada receipt POS direct-sale) telah dikonfirmasi pengguna berhasil dijalankan pada Supabase bersama. Tidak menjalankan ulang seed, migrasi, atau bundle SQL.
- Verifikasi POS terbaru bersifat baca-saja: Owner membuka POS, selector memuat C01–C06 termasuk C06 ber-limit Rp0, dan query receipt dengan `customer_id` sukses. Tidak ada sesi POS berstatus Open maupun hold; sesi `POS/00001` masih `Opening Control`. Hold, checkout, receipt customer-linked, replay idempotency, stok, dan jurnal POS belum diuji dengan mutasi karena perubahan akan persisten pada database bersama.
- Visual desktop telah diperiksa pada dashboard dan delapan route ERP. Pemeriksaan 390px menemukan navigasi aplikasi/workspace yang semula memakai strip scroll horizontal; CSS telah diperbaiki agar semua tautan membungkus beberapa baris. Pengukuran POS setelah perbaikan: lebar dokumen 375px pada viewport 390px, semua tautan terlihat. Halaman login dalam keadaan anonim belum diperiksa.
- Setelah perubahan navigasi, `npm run typecheck`, `npm run lint`, dan `npm run build` lulus. Server preview lokal tetap aktif pada `http://127.0.0.1:3000` (PID 32336); itu bukan pekerjaan coding yang berjalan.
- Pengujian T-01–T-36 belum lengkap; gap implementasi pada daftar di atas tetap berlaku. Prioritas lanjutan adalah membuat/menggunakan Supabase uji terisolasi untuk POS dan fixture bersih, kemudian menguji transaksi beserta persistensi stok/jurnal tanpa mengubah project bersama.

## Pengerjaan langsung — 6 November 2026

- Mempertahankan perubahan lokal sebelumnya pada demo-workspace.tsx dan demo-data.ts.
- Mengganti form hold POS dua baris dengan keranjang dinamis, tombol tambah/hapus produk, estimasi subtotal/PBJT, pending state, dan validasi server atas semua baris (SKU duplikat, jumlah kosong/pecahan/negatif, field tidak seimbang). RPC serta idempotency key tetap dipakai. Tidak ada migrasi atau mutasi database.
- Menambahkan komponen tabel bersama dengan pencarian, filter Status/Tahap, pengelompokan, reset tampilan, jumlah hasil, dan empty state pada tabel live module-page. Pencarian mencakup data yang sudah dimuat, bukan pencarian server atas seluruh database.
- Mengubah waktu transaksi module-page menjadi eksplisit Asia/Jakarta/WIB dan mengganti deskripsi teknis header dengan instruksi pengguna.
- Menambahkan ERP_VERIFY_BUILD=1 untuk folder build terpisah (.next-verify), serta ignore Git/ESLint.
- Verifikasi: TypeScript lulus; ESLint src + test runner + next.config lulus; scripts/test-pos-cart.cjs lulus untuk keranjang 3 produk dan input tidak valid. git diff --check lulus.
- Build BELUM lulus pada sesi ini: build default mengalami EPERM pada folder .next-local; build terpisah mengalami Turbopack child-process failure; percobaan webpack mengalami EPERM pada .next-verify/server. Tidak melakukan penghapusan rekursif untuk memaksa build. OneDrive menampilkan konfirmasi penghapusan file hasil build; pengguna diarahkan memilih Keep karena daftar penuh belum ditinjau.
- Preview pengguna ERR_CONNECTION_RESET. Percobaan start port 3000 ditolak Next karena server lama PID 41716 terdaftar; proses itu tidak terlihat dari lingkungan shell ini. Restart preview perlu diselesaikan dari terminal VS Code pengguna atau sesi dengan akses proses yang sesuai. Jangan menganggap preview baru sudah terverifikasi.
- Tidak melakukan pengujian browser/transaksi live, tidak menjalankan ulang seed/SQL, dan tidak push. Seluruh gap bisnis sebelumnya tetap terbuka.

## Lanjutan langsung — pemulihan preview dan UI

- Preview pulih: GET /login memberi HTTP 200 dan browser menampilkan formulir login Kopi Sela Kota. Tidak meminta/menggunakan password pengguna; halaman terautentikasi baru belum diperiksa visual pada sesi ini.
- Mengganti default script dev/build ke Webpack karena Turbopack gagal membuat child process compiler CSS. Folder preview .next-preview dan build verifikasi .next-check dipisahkan; tidak menghapus folder cache lama. Folder .next-* diabaikan Git/ESLint.
- Build Webpack penuh lulus setelah penambahan Kanban CRM dan route /pos/receipt/[number]. TypeScript dan ESLint juga lulus.
- Kanban CRM menampilkan peluang menurut tahap, pencarian/filter, jumlah dan nilai per tahap, probabilitas, serta alasan Lost. Mutasi tahap tetap memakai form/server action yang ada.
- Detail struk POS ditambahkan: nomor struk pada tabel dapat diklik, data baris/tender/PBJT dibaca dari database, role Cashier/Owner ditegakkan server, tersedia cetak/simpan PDF browser. Belum diverifikasi dengan struk live pada sesi ini.
- Tombol form transaksi menampilkan pending state dan dinonaktifkan selama pengiriman.
- Keranjang POS dinamis dan shared data table dari tahap sebelumnya dipertahankan; script npm run test:pos-cart tersedia.
- Tidak ada migrasi baru, seed/reset, perubahan saldo, atau push GitHub. Semua gap bisnis yang belum ditutup pada matriks tetap berlaku; ini belum penyelesaian seluruh UAS.

## Penyempurnaan UX berbasis Odoo — 6 November 2026

- Mengganti susunan seluruh form/tabel live module-page dengan workspace aksi + tab daftar dokumen. Form dibuka dalam dialog native, ada batal/Escape dan pengembalian fokus. Tab mendukung panah/Home/End, dan konten tetap mounted agar filter tidak hilang.
- Aksi disaring sesuai role pada server; kontrol keamanan action/database tetap dipertahankan. Header memakai judul/deskripsi operasional dan tidak lagi menjelaskan RPC kepada pengguna.
- Menambahkan penanda menu aktif dan aria-current pada app switcher/sidebar.
- Menyatukan Inventory ke pola workspace: ringkasan stok, tab Stok per lokasi/Riwayat, form transfer dialog, pencarian/filter/group by, dan waktu WIB.
- Menyederhanakan toolbar tabel: pencarian utama, disclosure Filter & Group By, reset saat filter aktif; mengurangi panjang toolbar di layar kecil.
- Memperbaiki allowedDevOrigins hanya untuk localhost/127.0.0.1 agar aset pengembangan dan interaksi preview loopback tersedia.
- Menguji komponen dengan halaman contoh sementara terpisah dari Supabase: modal buka/tutup/Escape/return focus, pencarian, tab klik/keyboard, filter status, reset berhasil. Desktop, dialog, dan 390x844 diperiksa. Halaman/launcher sementara dihapus dan server uji ditutup.
- Panduan desain dan bukti uji dicatat di ui-ux-guidelines.md. Tidak menjalankan seed, migrasi, posting transaksi, atau push GitHub pada tahap ini.
- Pemeriksaan visual pada sesi Owner aktual dan pengujian seluruh role/transaksi tetap belum lengkap; jangan menyamakan uji komponen dengan T-01–T-36.

## Audit dan kelengkapan role — 6 November 2026

- Query SQL langsung mengonfirmasi satu profil Owner, satu akun Auth terkait dan terkonfirmasi; lima role staf belum mempunyai profil/akun uji.
- Menambahkan matriks routeAccess terpusat dan menggunakannya untuk otorisasi halaman modul. Tes test:role-policy lulus untuk enam role, konsistensi tujuh menu, dan batas server-action Credit Note.
- Memperbaiki ketidaksesuaian Warehouse pada halaman retur: hanya referensi pengiriman, tanpa query saldo invoice yang tidak diizinkan dan tanpa tombol posting Credit Note. Form inspeksi terpisah tetap gap implementasi.
- Menyamakan server-action posting Credit Note menjadi Finance/Owner. Guard RPC semula masih mengizinkan Sales. Setelah izin eksplisit pengguna, migrasi 006 berhasil diterapkan pada Supabase bersama; query verifikasi finance_owner_guard=true. Tidak ada perubahan saldo, seed, atau posting transaksi.
- Menyiapkan roles:setup untuk membuat enam akun uji melalui Admin API menggunakan secret key yang dimasukkan tersembunyi di terminal. Script tidak mengganti akun/password asli dan menyimpan password acak akun uji di file .env.role-accounts.local yang diabaikan Git. Script belum dijalankan karena key admin belum disediakan secara lokal.
- Menyiapkan test:roles: login password nyata, profil, URL SSR langsung, RLS jurnal/akun/biaya, penolakan UPDATE profil, penolakan RPC lintas-role, logout dan redirect sesudah logout. Laporan hanya hasil aktual tanpa password/token.
- Test runner berhenti dengan pesan akun uji belum tersedia; T-02/tes login staf tidak ditandai lulus.
- Build Webpack, TypeScript, ESLint, tes kebijakan role, dan tes validasi keranjang lulus. Bundle setup/apply-transactions diperbarui untuk instalasi baru; JANGAN jalankan ulang bundle penuh pada database bersama.
- Panduan: docs/role-access-matrix.md. Tindakan berikutnya: jalankan npm run roles:setup di terminal lokal dan masukkan secret/service-role key secara tersembunyi, lalu npm run test:roles. Tanpa akun uji, pengujian login enam role belum selesai.

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

## Tata letak baru berdasarkan referensi pengguna - 6 November 2026

- Sidebar kiri untuk seluruh aplikasi yang diizinkan, identitas usaha, breadcrumb, akun/peran dan tombol keluar. Tujuh aplikasi tetap mengikuti empat kelompok PDF; Retur/laporan bukan aplikasi tambahan.
- Beranda memakai kartu ringkasan dan kartu aplikasi dengan ikon SVG orisinal, nama Indonesia, nama modul serta deskripsi tugas. Pencarian dan filter kelompok tersedia; tidak mengiklankan lifecycle Quotation yang belum dibuat.
- Palet putih/abu lembut dengan cokelat kopi, ruang antarkartu, fokus keyboard, skip link, status teks dan dukungan reduced motion. Pada HP tersedia menu aplikasi yang menutup setelah navigasi; tabel menggulir di dalam wadah.
- Ringkasan keuangan diperbaiki agar muncul untuk Finance meskipun tidak punya akses stok. Tidak mengubah permission atau nilai database.
- Browser Owner live: 7 kartu; pencarian stok menyisakan Inventory, pencarian tidak ditemukan menampilkan reset, reset mengembalikan 7; filter Rantai pasok menampilkan Pembelian/Produk & stok. Beranda dan modal Sales diperiksa pada 390x844; menu mobile menutup saat memilih Sales. Lebar dokumen Sales 375 pada viewport 390, tidak melebar karena tabel.
- Pengujian SSR tambahan: Finance memiliki 2 kartu dan laporan keuangan; Sales memiliki 2 kartu tanpa laporan. test:roles diulang: 114 PASS / 0 FAIL. Build webpack, typecheck, lint dan test:role-policy lulus. Tidak ada transaksi usaha/migrasi/seed/reset dalam pekerjaan UI ini.
- Pemeriksaan browser Edge sempat timeout; pemeriksaan visual selesai melalui browser aplikasi. Viewport dikembalikan ke default. Screenshot final disimpan di outputs pengguna, bukan data fixture atau angka buatan.
- Ini penyelesaian pembaruan layout/beranda, bukan klaim seluruh fitur PDF/T-01-T-36 selesai.

## Perbaikan regresi sidebar Retur - 6 November 2026

- Penyebab: ModuleNavigation otomatis menyisipkan seluruh aplikasi setelah keluar dari beranda, sehingga menu Retur terdorong ke bawah dan susunan sidebar berbeda antar halaman.
- Diganti pemilih aplikasi yang konsisten pada semua halaman: tertutup secara default, dibuka hanya atas tindakan pengguna, menutup setelah memilih modul/perubahan route. Kartu beranda tetap menjadi pintu masuk utama; daftar aplikasi tidak otomatis diulang.
- Owner browser: Beranda digulir ke bawah lalu Retur, Retur -> pilih Sales -> Retur; konten Retur tampil, scroll halaman 0, judul berada di layar, dan hanya Retur memiliki aria-current=page. Posisi link Retur di Sales/Retur sama sekitar y=343px saat pemilih tertutup.
- Form Catat retur & Credit Note terbuka, batal kembali ke daftar; tab Credit Note menampilkan keadaan kosong yang jelas, kembali Invoice terkait menampilkan 3 invoice. Tidak menekan posting atau membuat transaksi.
- HP 390x844: menu, pemilih aplikasi, link aktif dan isi Retur diperiksa; documentWidth=375 <= viewport 390. Viewport dikembalikan ke default setelah pemeriksaan.
- Typecheck, lint dan production build lulus. test:roles diulang: 114 PASS, 0 FAIL, termasuk Retur untuk Warehouse/Finance/Owner dan penolakan untuk role lain.
- Cakupan perubahan ini navigasi/tampilan. Guard role, transaksi dan database tidak diubah. Uji bisnis lengkap T-01-T-36 dan form inspeksi Warehouse yang belum lengkap tidak dinyatakan selesai.

## Standar istilah Odoo - 6 November 2026

- Nama aplikasi, dokumen, status, field dan aksi memakai Inggris; penjelasan dan pesan operasional tetap Indonesia sesuai PDF. Menggantikan judul aplikasi Indonesia pada desain sebelumnya.
- Istilah tampilan terpusat di src/lib/erp-terminology.ts; klasifikasi aksi/role, FormData, nilai database dan nominal tetap. Nama aplikasi tidak diulang dua kali pada kartu/sidebar.
- Penamaan konsisten pada kartu, sidebar, breadcrumb, halaman modul, table headers, form, tombol, CRM stages dan Receipt, termasuk mode demo. Panduan: docs/language-and-odoo-terms.md.
- Typecheck, lint, build dan kebijakan role lulus; pengujian akses aktual 114 PASS / 0 FAIL. Browser Sales/form diperiksa dengan nama Inggris dan bantuan Indonesia, tanpa membuat transaksi bisnis.
