# UI/UX Kopi Sela Kota

## Acuan dan prioritas

- PDF skenario tetap sumber bidang, aturan, dan wireframe wajib.
- Odoo Web 17 menjadi acuan pola aplikasi, navigasi modul, daftar dokumen, Kanban, formulir, pencarian, filter, dan Group By. Referensi: https://www.odoo.com/documentation/17.0/applications/essentials/search.html
- Identitas visual orisinal: espresso/cokelat, krem terang, panel putih, status dengan teks.

## Pola yang diterapkan

1. Daftar dokumen muncul pada keadaan awal. Form transaksi dibuka melalui tombol aksi agar tidak menumpuk dengan seluruh tabel.
2. Jenis dokumen dipisahkan dengan tab. Navigasi keyboard Arrow Left/Right, Home/End disediakan; filter tiap tab tetap tersimpan selama pindah tab.
3. Form dialog mempunyai judul, label, instruksi, tombol simpan, batal, dan tutup. Dialog native membatasi fokus; Escape menutup dan fokus kembali ke tombol pembuka.
4. Tombol aksi disesuaikan role di server, dengan otorisasi server/database yang tetap berlaku.
5. Pencarian selalu terlihat. Filter/status dan Group By ada pada menu disclosure yang dibuka saat diperlukan. Ada jumlah hasil, reset saat aktif, dan pesan tanpa hasil.
6. Aplikasi aktif ditandai warna, garis, bobot teks, dan aria-current.
7. Istilah operasional memakai bahasa sederhana; istilah Odoo seperti Sales Order tetap dipertahankan jika membantu hubungan dokumen. Header pengguna tidak menampilkan RPC atau detail implementasi.
8. Stok menampilkan ringkasan lalu tab Stok per lokasi/Riwayat transfer. Penjelasan On Hand/Reserved/Available tersedia.
9. Halaman kecil memakai tombol yang membungkus, form satu kolom, dan tabel yang dapat digeser di dalam panel.

## Bukti pengujian sesi 6 November 2026

Komponen WorkspaceViews dan DataTable diuji lewat halaman sementara dengan data contoh, tanpa koneksi Supabase (server uji terpisah port 3002). Pengujian berhasil: membuka dialog, Escape/return focus, mencari nomor dokumen (2 menjadi 1 hasil), pindah tab dengan klik dan panah keyboard, membuka menu filter, memilih Partial Delivery (2 menjadi 1 hasil), reset filter. Screenshot desktop, dialog, dan viewport 390x844 diperiksa. Ukuran browser dikembalikan setelah uji. Halaman serta launcher pengujian sementara dihapus; tidak menjadi fitur publik.

Pengujian tersebut memverifikasi interaksi komponen, bukan seluruh alur transaksi live, role end-to-end, atau T-01–T-36.

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
