# Identitas tokoh skenario PDF

Sumber: PDF asli 24SI3 - Group 04 - Coffee Shop, tabel stakeholder halaman 4–6. Identitas di aplikasi mengikuti tokoh usaha. Nama mahasiswa tetap digunakan hanya untuk dokumen kelompok dan kontribusi.

| Role | Nama profil aplikasi |
|---|---|
| Sales | Arif Mahendra |
| Warehouse | Fajar Pratama |
| Procurement | Bima Santoso |
| Finance | Dewi Larasati |
| Cashier | Maya Kusuma |
| Owner | Nadia Prameswari |

Pada 6 November 2026, seluruh tujuh profil pada database proyek diperiksa dan diselaraskan, termasuk kedua akun Owner. Setiap perubahan memiliki audit event. Email, password, role, ID akun, histori actor dan transaksi tidak ditulis ulang.

Sumber nama terpusat: `src/lib/scenario-identities.json`. Script pembuat akun memakai sumber yang sama, sehingga nama Uji role tidak muncul kembali. `scripts/align-scenario-names.cjs` digunakan hanya untuk penyelarasan profil pada project yang telah ditentukan; key admin dibaca dari file lokal yang diabaikan Git dan tidak dicetak.

Verifikasi: 120 PASS / 0 FAIL pada login password, profil, nama, SSR route, RLS dan penolakan aksi lintas role; lint dan typecheck lulus. Beranda browser menampilkan Nadia Prameswari sebagai Owner. Ini bukan hasil pengujian seluruh transaksi T-01–T-36.

## Cakupan PDF yang masih harus diselesaikan

Matriks utama tetap `docs/requirements-traceability.md`. Jangan mengubah seluruh status menjadi selesai karena nama dan akses role sudah lulus.

- Contacts dan Products: pengelolaan master/form belum memenuhi seluruh bidang wireframe.
- Quotation dan RFQ: lifecycle dokumen awal belum lengkap; Sales Order dan Purchase Order saat ini dibuat langsung.
- Discount: alur permintaan/persetujuan Owner untuk di atas 5% sampai 10% belum tersedia.
- Returns: tahap inspeksi Warehouse terpisah sebelum Credit Note belum lengkap.
- Reporting: periode, net sales, PBJT, COGS, margin dan drill-down sesuai SR-13 belum lengkap.
- Log Notes dan relasi/smart button dokumen belum lengkap pada seluruh layar.
- POS hold: customer link dan pengujian expiry otomatis belum lengkap.
- Pengujian fixture bersih T-01–T-36, deployment publik, serta bukti penyerahan belum lengkap.

Tidak menjalankan seed/reset database bersama. Tiga konflik aturan stakeholder tetap mengikuti Decision Log, bukan diubah tanpa pencatatan.
