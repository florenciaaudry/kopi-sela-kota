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
