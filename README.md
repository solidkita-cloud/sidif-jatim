# SIDIF — Sistem Data Imunisasi & Surveilans Difteri Jawa Timur

Platform terintegrasi pelaporan data imunisasi dan kasus difteri 38 Kabupaten/Kota ke Dinas Kesehatan Provinsi Jawa Timur sesuai standar resmi **Form DIF-3 Kemenkes** dan dokumen **PRD v2.0**.

---

## Fitur Utama

1. **Pintu Masuk (Welcome Screen):** Tampilan putih minimalis dengan logo dan judul dinamis (`SIDIF`, dapat diubah menjadi `PUSATSIDIF` dari panel admin).
2. **Dashboard Publik & Peta 2D Interaktif:**
   - Peta batas wilayah resmi 38 Kabupaten/Kota se-Jawa Timur (GeoJSON asli 60.3 KB).
   - Pewarnaan otomatis: Putih (0 Kasus), Merah Solid (Konfirmasi Lab), Merah Arsir (Sinyal Kompatibel Klinis).
   - Legenda & kartu rincian kabupaten interaktif saat poligon diklik.
   - Kurva Epidemiologi Mingguan (M1–M43), Donut status imunisasi kasus, dan grafik tren bulanan.
3. **Sistem Login Ramah Usia 40+:**
   - 40 Akun bawaan (38 Kabupaten/Kota dengan format ringkas `SIDIF_BKL`, `SIDIF_SDA`, `SIDIF_KTMLG`, dll. + Admin Provinsi).
   - Password awal seragam: `12345678`.
   - Proteksi brute-force 5x salah kunci akun 15 menit.
   - Penerbitan token acak reset sandi 24 jam (`SIDIF-XXXXXX`).
4. **Isolasi Wilayah Ketat (Anti-Nyebrang):**
   - Saat petugas login, kolom Kabupaten/Kota terkunci mati sesuai akun daerahnya.
   - Dropdown Kecamatan menyusut otomatis hanya menampilkan kecamatan di wilayah tersebut (contoh: Surabaya hanya menampilkan 31 kecamatan di Surabaya; Jombang hanya kecamatan di Jombang).
5. **Form Input DIF-3 Terpandu:**
   - Penandaan warna khusus pada **KOLOM WAJIB** (latar krem muda `#FFFBEB`, border amber, dan badge merah `[ WAJIB ]`).
   - Panduan keterangan bahasa manusia di samping kanan setiap kolom.
   - Pilihan Jenis Kelamin khusus: Kartu besar berikon **LAKI-LAKI (Biru)** dan **PEREMPUAN (Pink)**.
   - Input angka tanpa angka nol bawaan (*no default 0*), fitur *auto-select on focus*.
   - Kalkulasi otomatis: Umur (Tahun & Bulan), Total Dosis Difteri, dan Klasifikasi Klinis Kemenkes.
6. **Deteksi Anti-Dobel Cerdas:**
   - Hard block jika NIK 16 digit sudah terdaftar.
   - Soft warning jika skor kemiripan Nama + Nama Ibu + Tanggal Lahir $\ge 80\%$ (algoritma Jaro-Winkler).
   - Pilihan pengecualian saudara kembar atau pasien rujukan antar-daerah.
7. **Pop-up Konfirmasi Final:**
   - Dialog "Apakah seluruh data sudah benar?" dengan tombol lapang `[ Batal / Salah ]` dan `[ Ya, Benar ]`.
8. **Tabel Data, Riwayat & Paginasi Ringan:**
   - Pengurutan data (*sorting*) pada judul kolom (Nama, Tanggal Onset, No Epid, Status).
   - Paginasi fleksibel: 25, 50, 100, atau Semua baris per lembar.
9. **Form Penyelidikan Epidemiologi (PE) Otomatis:**
   - Tombol 1-klik `[ Form PE ]` membuka formulir resmi berkop Dinkes Jatim yang terisi otomatis 100% tanpa ketik ulang.
   - Siap cetak langsung ke printer atau disimpan sebagai PDF.
10. **Notifikasi Real-time Provinsi:**
    - Begitu kabupaten input data, layar provinsi menampilkan *floating toast notification* disertai denting audio chime.
    - Lencana angka lonceng di header bertambah otomatis.
11. **Ekspor Data:**
    - Unduh Excel (.xlsx) dengan kolom yang 100% identik dengan master Form DIF-3 Kemenkes.
    - Unduh slide paparan (.xlsx / .pptx format) untuk rapat pimpinan.

---

## Cara Menjalankan Secara Lokal

Buka terminal PowerShell di folder ini:

```bash
cd "D:\DHODHY\APLIKASI BIKINAN CODEX\DIFETRI\sidif-web"

# Opsi 1: Menggunakan Python (Sangat Mudah & Bawaan Windows)
python -m http.server 3000

# Opsi 2: Menggunakan npx serve
npx serve .
```

Buka browser di alamat: `http://localhost:3000`

---

## Cara Deploy ke Vercel (Gratis 100%)

1. Buka terminal di folder `sidif-web`:
   ```bash
   cd "D:\DHODHY\APLIKASI BIKINAN CODEX\DIFETRI\sidif-web"
   npx vercel
   ```
2. Ikuti petunjuk singkat di layar (cukup tekan `Enter` untuk setiap pertanyaan default).
3. Dalam waktu < 1 menit, web langsung aktif di domain Vercel publik (contoh: `https://sidif-jatim.vercel.app`).
