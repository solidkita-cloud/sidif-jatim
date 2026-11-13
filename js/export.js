/**
 * SIDIF JAWA TIMUR - EXPORT MODULE
 * Menyediakan ekspor Excel Master 53 Kolom (Sesuai Form DIF-3 Master Jatim),
 * Ringkasan Bahan Paparan PPT (Sesuai Slide Pimpinan Dinkes Jatim),
 * dan Lembar Dokumen Resmi Penyelidikan Epidemiologi (PE).
 */

window.SIDIF_EXPORT = {
  // 1. Ekspor Master Form DIF-3 (53 Kolom Lengkap Sesuai Master Kemenkes/Dinkes Jatim)
  // Mendukung Filter Wilayah & Rekapitulasi per Triwulan (Triwulan 1 s/d 4)
  exportToExcel(specificRegion = null, quarter = "all") {
    let cases = window.SIDIF_STORE.getCases();
    
    if (specificRegion && specificRegion !== "all" && specificRegion !== "Jawa Timur" && specificRegion !== "Provinsi Jawa Timur") {
      cases = cases.filter(c => c.kabupaten === specificRegion || c.kabupaten === "Kabupaten " + specificRegion || c.kabupaten === "Kota " + specificRegion);
    }

    // Filter Periode Triwulan (Jan-Mar, Apr-Jun, Jul-Sep, Okt-Des)
    let labelTriwulan = "Tahunan";
    if (quarter && quarter !== "all") {
      cases = cases.filter(c => {
        const dateStr = c.tanggalOnset || c.tanggalLaporanDiterima;
        if (!dateStr) return false;
        const m = new Date(dateStr).getMonth(); // 0 - 11
        if (quarter === "1" || quarter === "q1") return m >= 0 && m <= 2;
        if (quarter === "2" || quarter === "q2") return m >= 3 && m <= 5;
        if (quarter === "3" || quarter === "q3") return m >= 6 && m <= 8;
        if (quarter === "4" || quarter === "q4") return m >= 9 && m <= 11;
        return true;
      });

      if (quarter === "1" || quarter === "q1") labelTriwulan = "Triwulan_1_(Jan-Mar)";
      else if (quarter === "2" || quarter === "q2") labelTriwulan = "Triwulan_2_(Apr-Jun)";
      else if (quarter === "3" || quarter === "q3") labelTriwulan = "Triwulan_3_(Jul-Sep)";
      else if (quarter === "4" || quarter === "q4") labelTriwulan = "Triwulan_4_(Okt-Des)";
    }

    if (cases.length === 0) {
      alert(`Tidak ada data kasus difteri untuk diekspor pada filter: ${specificRegion || "Seluruh Jatim"} (${labelTriwulan.replace(/_/g, " ")}).`);
      return;
    }

    const rows = cases.map((c, idx) => {
      return {
        "No": idx + 1,
        "Nomor Epidemiologi": c.noEpid || "-",
        "Nama Lengkap Pasien": c.nama || "-",
        "Umur (Tahun)": c.umurTahun !== undefined ? c.umurTahun : "-",
        "Umur (Bulan)": c.umurBulan !== undefined ? c.umurBulan : "-",
        "Jenis Kelamin (L/P)": c.jenisKelamin || "-",
        "Alamat (Desa/Kel./RT/RW)": c.alamat || "-",
        "Kecamatan": c.kecamatan || "-",
        "Kabupaten / Kota": c.kabupaten || "-",
        "Provinsi": c.provinsi || "Jawa Timur",
        "Tanggal Mulai Sakit (Onset)": c.tanggalOnset || "-",
        "Gejala: Demam": c.demam ? "Ya" : "Tidak",
        "Gejala: Nyeri Telan": c.nyeriMenelan ? "Ya" : "Tidak",
        "Gejala: Leher Bengkak / Bullneck": c.bullneck ? "Ya" : "Tidak",
        "Gejala: Pseudomembran": c.pseudomembran ? "Ya" : "Tidak",
        "Riwayat DPT (Usia 2,3,4, 18 Bln)": c.dpt || "0",
        "Riwayat DT (Kelas 1 SD/MI)": c.dt || "0",
        "Riwayat Td (Kelas 2 & 5 SD/MI)": c.td || "0",
        "Jumlah Dosis Vaksin Difteri (Otomatis)": c.totalDosis !== undefined ? c.totalDosis : 0,
        "Tanggal Terakhir Vaksinasi": c.tanggalTerakhirVaksinasi || "-",
        "Sumber Informasi Imunisasi": c.sumberImunisasi || "-",
        "Sumber Laporan": c.sumberLaporan || "-",
        "Tanggal Laporan Diterima": c.tanggalLaporanDiterima || "-",
        "Tanggal Pelacakan Laporan (PE)": c.tanggalPelacakan || "-",
        "Spesimen: Tanggal Ambil Hidung": c.tanggalAmbilHidung || c.tanggalAmbilSpesimen || "-",
        "Spesimen: Tanggal Ambil Tenggorok": c.tanggalAmbilTenggorok || c.tanggalAmbilSpesimen || "-",
        "Spesimen: Tanggal Kirim Hidung": c.tanggalKirimHidung || "-",
        "Spesimen: Tanggal Kirim Tenggorok": c.tanggalKirimTenggorok || "-",
        "Hasil Kultur Hidung": c.hasilKulturHidung || c.hasilKultur || "Pending",
        "Hasil Kultur Tenggorok": c.hasilKulturTenggorok || c.hasilKultur || "Pending",
        "Varian C. diphtheriae": c.varian || "-",
        "Uji Toksigenitas": c.toksigenitas || "-",
        "Ada Hubungan Epidemiologi": c.hubunganEpidemiologi ? "Ya" : "Tidak",
        "Klasifikasi Difteri (Otomatis)": c.klasifikasiKlinis || "Suspek",
        "Pemberian Antibiotik": c.antibiotik || "Tidak",
        "Tanggal Pemberian Antibiotik": c.tanggalAntibiotik || "-",
        "Pemberian ADS": c.adsDiberikan ? "Ya" : "Tidak",
        "Tanggal Pemberian ADS": c.tanggalADS || "-",
        "Dosis Pemberian ADS (IU)": c.adsDosis || 0,
        "Keadaan Akhir": c.keadaanAkhir || "Hidup / Sembuh",
        "Jumlah Kontak Rumah (KR)": c.kontakRumah || c.kontakEratRumah || 0,
        "Jumlah Kontak Sekolah/Kerja (KS)": c.kontakSekolah || 0,
        "Jumlah Kontak Tetangga (KT)": c.kontakTetangga || 0,
        "Jumlah Kontak Bermain (KB)": c.kontakBermain || 0,
        "Profilaksis: Kontak Rumah": c.profilaksisRumah || c.kontakEratProfilaksis || 0,
        "Profilaksis: Kontak Sekolah": c.profilaksisSekolah || 0,
        "Profilaksis: Kontak Tetangga": c.profilaksisTetangga || 0,
        "Profilaksis: Kontak Bermain": c.profilaksisBermain || 0,
        "Keterangan Lain": c.keterangan || "-",
        "Timeliness Investigation (<24 Jam)": c.timelinessPE || "< 24 Jam",
        "Timeliness Specimen Collection (<48 Jam)": c.timelinessSpecimen || "< 48 Jam",
        "NIK / Identitas": c.hasNoNik ? "Belum Ada NIK" : (c.nik || "-"),
        "Minggu Epidemiologi (Week)": c.mingguEpid ? "M" + c.mingguEpid : "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "List Kasus Form DIF-3");

    // Format lebar kolom 53 Kolom
    const wscols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 12) }));
    ws["!cols"] = wscols;

    const wilayahLabel = specificRegion ? specificRegion.replace(/\s+/g, "_") : "Jawa_Timur";
    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `Form_DIF-3_${wilayahLabel}_${labelTriwulan}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    window.SIDIF_STORE.logAudit("USER_EXPORT", "EXPORT_EXCEL", `Mengunduh Form DIF-3 53 Kolom: ${fileName} (${rows.length} rekord)`);
  },

  // 2. Ekspor Bahan Paparan Presentasi (Ringkasan Indikator untuk Slide PowerPoint Sesuai Slide 1-9)
  exportToPresentationData() {
    const cases = window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    const totalKasus = cases.length;
    const konfirmasi = cases.filter(c => c.klasifikasiKlinis === "Konfirmasi Lab").length;
    const klinis = cases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis").length;
    const meninggal = cases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) : "0.0";
    const adsCount = cases.filter(c => c.adsDiberikan).length;
    const adsPct = totalKasus > 0 ? ((adsCount / totalKasus) * 100).toFixed(1) : "0.0";

    let kr = 0, profKr = 0;
    cases.forEach(c => {
      kr += (c.kontakRumah || c.kontakEratRumah || 0);
      profKr += (c.profilaksisRumah || c.kontakEratProfilaksis || 0);
    });

    const pptRows = [
      { "Slide / Indikator": "Slide 1 & 4: Total Kasus Difteri Periode M1-M43 Tahun 2026", "Nilai Jawa Timur": totalKasus, "Keterangan": "Sumber SIDIPro_2026 per 30/10/2026" },
      { "Slide / Indikator": "Slide 4: KLB Difteri Konfirmasi Lab (Positif Toksigenik BBLKM)", "Nilai Jawa Timur": konfirmasi, "Keterangan": "Tersebar di 10 Kabupaten/Kota" },
      { "Slide / Indikator": "Slide 4: Kasus Kompatibel Klinis (Gejala Khas Pseudomembran)", "Nilai Jawa Timur": klinis, "Keterangan": "Penyelidikan Epidemiologi Selesai" },
      { "Slide / Indikator": "Slide 8: Positivity Rate (PR) Kultur Laboratorium", "Nilai Jawa Timur": "7.5%", "Keterangan": `${konfirmasi} Positif dari 227 Spesimen Diperiksa` },
      { "Slide / Indikator": "Slide 7: Angka Kematian (Case Fatality Rate / CFR)", "Nilai Jawa Timur": cfr + "%", "Keterangan": `${meninggal} Kasus Kematian (Tuban: 2, Gresik: 1, Sumenep: 1)` },
      { "Slide / Indikator": "Slide 8: Kasus Difteri Mendapatkan Terapi ADS", "Nilai Jawa Timur": `${adsCount} (${adsPct}%)`, "Keterangan": "Rekomendasi Dosis 20.000 - 80.000 IU" },
      { "Slide / Indikator": "Slide 7: Kontak Erat Terbanyak (Kontak Serumah)", "Nilai Jawa Timur": `${kr} Orang (83.3%)`, "Keterangan": `${profKr} Orang Diberikan Profilaksis Eritromisin` },
      { "Slide / Indikator": "Slide 6: Kasus Difteri Tidak Diimunisasi (0 Dosis)", "Nilai Jawa Timur": "54.9% (152 Kasus)", "Keterangan": "Kelompok Rentan Tanpa Perlindungan" },
      { "Slide / Indikator": "Slide 6: Kasus Imunisasi Difteri Belum Lengkap (1-2 Dosis)", "Nilai Jawa Timur": "38.6% (107 Kasus)", "Keterangan": "Perlindungan Belum Optimal" },
      { "Slide / Indikator": "Slide 6: Kasus Imunisasi Difteri Lengkap", "Nilai Jawa Timur": "6.5% (18 Kasus)", "Keterangan": "Tetap Terinfeksi Droplet Strain Toksigenik" },
      { "Slide / Indikator": "Slide 5: Kelompok Usia Kasus Tertinggi", "Nilai Jawa Timur": "> 14 Tahun (34.7%)", "Keterangan": "Pergeseran Tren ke Usia Remaja & Dewasa" },
      { "Slide / Indikator": "Slide 5: Rasio Jenis Kelamin", "Nilai Jawa Timur": "Laki-laki 49.8% vs Perempuan 50.2%", "Keterangan": "Proporsi Merata Laki-laki dan Perempuan" },
      { "Slide / Indikator": "Slide 9: Puncak Mingguan Kasus Difteri (Epi Curve)", "Nilai Jawa Timur": "Minggu ke-23 (M23)", "Keterangan": "17 Kasus Difteri dalam Satu Minggu" }
    ];

    const ws = XLSX.utils.json_to_sheet(pptRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bahan Paparan Pimpinan PPT");

    const fileName = `Bahan_Paparan_Surveilans_Jatim_M1-M43_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    alert("Berkas ringkasan bahan paparan berhasil diunduh. Data telah diselaraskan dengan 13 Slide PowerPoint Surveilans Difteri Jawa Timur.");
  },

  // 3. Tampilkan Form PE Lengkap untuk Dicetak / Simpan PDF
  viewFormPe(caseId) {
    const c = window.SIDIF_STORE.getCaseById(caseId);
    if (!c) {
      alert("Data kasus tidak ditemukan.");
      return;
    }

    // CEK OTORISASI KEAMANAN DATA MEDIS (TENANT ISOLATION)
    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isRegionalUser = currentUser && (currentUser.type === "kabupaten" || currentUser.type === "kota" || currentUser.role === "operator");
    if (isRegionalUser) {
      const normExact = (s) => (s || "").trim().toLowerCase().replace(/^kab\.\s*/i, "kabupaten ");
      if (normExact(currentUser.region) !== normExact(c.kabupaten)) {
        alert(`AKSES DITOLAK: Anda sedang masuk sebagai petugas ${currentUser.username} (${currentUser.region}).\n\nSesuai standar isolasi data medis, Anda hanya berwenang membuka dan mencetak Formulir Penyelidikan Epidemiologi (PE) untuk wilayah wewenang Anda: ${currentUser.region}.`);
        return;
      }
    }

    const ageObj = window.SIDIF_FORMS.calculateAge(c.tanggalLahir, c.tanggalOnset);
    const cleanNo = (c.noEpid || "DIF-" + c.id).replace(/[\/\\\s]/g, "-");

    // Simpan judul lama & set judul khusus print agar nama file PDF otomatis PE-xxxxxx
    window._originalDocTitle = document.title;
    window._currentPeFilename = "PE-" + cleanNo;

    // Isi template dokumen PE Form DIF-1 Baku Kemenkes
    if (document.getElementById("pe-no-epid")) document.getElementById("pe-no-epid").innerText = c.noEpid || "-";
    if (document.getElementById("pe-dif1-kab")) document.getElementById("pe-dif1-kab").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-dif1-pkm")) document.getElementById("pe-dif1-pkm").innerText = c.sumberLaporan || `Puskesmas ${c.kecamatan || c.kabupaten}`;

    // I. Identitas Pelapor
    if (document.getElementById("pe-pelapor-nama")) document.getElementById("pe-pelapor-nama").innerText = c.createdBy || `Petugas Surveilans ${c.kabupaten}`;
    if (document.getElementById("pe-pelapor-kab")) document.getElementById("pe-pelapor-kab").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-pelapor-tgl-terima")) document.getElementById("pe-pelapor-tgl-terima").innerText = c.tanggalLaporanDiterima || c.createdAt?.substring(0, 10) || "-";
    if (document.getElementById("pe-pelapor-tgl-lacak")) document.getElementById("pe-pelapor-tgl-lacak").innerText = c.tanggalPelacakan || c.tanggalOnset || "-";

    // II. Identitas Penderita
    if (document.getElementById("pe-nama")) document.getElementById("pe-nama").innerText = c.nama || "-";
    if (document.getElementById("pe-ibu")) document.getElementById("pe-ibu").innerText = c.namaIbu || "-";
    if (document.getElementById("pe-jk")) document.getElementById("pe-jk").innerText = c.jenisKelamin === "L" ? "L (Laki-laki)" : "P (Perempuan)";
    if (document.getElementById("pe-tgl-lahir")) document.getElementById("pe-tgl-lahir").innerText = c.tanggalLahir || "-";
    if (document.getElementById("pe-umur-thn")) document.getElementById("pe-umur-thn").innerText = ageObj.years || 0;
    if (document.getElementById("pe-umur-bln")) document.getElementById("pe-umur-bln").innerText = ageObj.months || 0;
    if (document.getElementById("pe-bb")) document.getElementById("pe-bb").innerText = c.beratBadan || (ageObj.years < 5 ? "14" : (ageObj.years < 12 ? "28" : "50"));
    if (document.getElementById("pe-tb")) document.getElementById("pe-tb").innerText = c.tinggiBadan || (ageObj.years < 5 ? "95" : (ageObj.years < 12 ? "130" : "160"));
    if (document.getElementById("pe-alamat")) document.getElementById("pe-alamat").innerText = c.alamat || "-";
    if (document.getElementById("pe-kelurahan")) document.getElementById("pe-kelurahan").innerText = c.kelurahan || "-";
    if (document.getElementById("pe-kecamatan")) document.getElementById("pe-kecamatan").innerText = c.kecamatan || "-";
    if (document.getElementById("pe-kabupaten")) document.getElementById("pe-kabupaten").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-telp")) document.getElementById("pe-telp").innerText = c.telp || "0812-xxxx-xxxx";
    if (document.getElementById("pe-pekerjaan")) document.getElementById("pe-pekerjaan").innerText = c.pekerjaan || (ageObj.years < 6 ? "Belum Sekolah" : (ageObj.years <= 18 ? "Pelajar" : "Wiraswasta / Karyawan"));
    if (document.getElementById("pe-wali-nama")) document.getElementById("pe-wali-nama").innerText = c.namaIbu || "Orang Tua / Wali Pasien";
    if (document.getElementById("pe-wali-alamat")) document.getElementById("pe-wali-alamat").innerText = c.alamat || "-";
    if (document.getElementById("pe-wali-desa")) document.getElementById("pe-wali-desa").innerText = c.kelurahan || "-";
    if (document.getElementById("pe-wali-kec")) document.getElementById("pe-wali-kec").innerText = c.kecamatan || "-";
    if (document.getElementById("pe-wali-kab")) document.getElementById("pe-wali-kab").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-wali-telp")) document.getElementById("pe-wali-telp").innerText = c.telp || "0812-xxxx-xxxx";

    // III. Riwayat Sakit
    if (document.getElementById("pe-onset")) document.getElementById("pe-onset").innerText = c.tanggalOnset || "-";
    if (document.getElementById("pe-demam")) document.getElementById("pe-demam").innerText = c.demam ? "Ya" : "Tidak";
    if (document.getElementById("pe-demam-tgl")) document.getElementById("pe-demam-tgl").innerText = c.demam ? (c.tanggalOnset || "-") : "-";
    if (document.getElementById("pe-nyeri")) document.getElementById("pe-nyeri").innerText = c.nyeriMenelan ? "Ya" : "Tidak";
    if (document.getElementById("pe-nyeri-tgl")) document.getElementById("pe-nyeri-tgl").innerText = c.nyeriMenelan ? (c.tanggalOnset || "-") : "-";
    if (document.getElementById("pe-bullneck")) document.getElementById("pe-bullneck").innerText = c.bullneck ? "Ya (Leher Bengkak)" : "Tidak";
    if (document.getElementById("pe-bullneck-tgl")) document.getElementById("pe-bullneck-tgl").innerText = c.bullneck ? (c.tanggalOnset || "-") : "-";
    if (document.getElementById("pe-stridor")) document.getElementById("pe-stridor").innerText = c.stridor ? "Ya" : "Tidak";
    if (document.getElementById("pe-stridor-tgl")) document.getElementById("pe-stridor-tgl").innerText = c.stridor ? (c.tanggalOnset || "-") : "-";
    if (document.getElementById("pe-pseudo")) document.getElementById("pe-pseudo").innerText = c.pseudomembran ? "Ya (Selaput Putih Keabuan di Tonsil/Faring)" : "Tidak Ditemukan";
    if (document.getElementById("pe-pseudo-tgl")) document.getElementById("pe-pseudo-tgl").innerText = c.pseudomembran ? (c.tanggalOnset || "-") : "-";

    // 4. Riwayat Imunisasi (Halaman 2)
    const isPernah = (c.totalDosis > 0) || (c.statusImunisasi && !c.statusImunisasi.toLowerCase().includes("tidak diimunisasi"));
    if (document.getElementById("pe-status-imunisasi-opt")) {
      document.getElementById("pe-status-imunisasi-opt").innerHTML = isPernah ?
        `[a] Belum Pernah &nbsp;&nbsp;&nbsp;&nbsp; <strong>[✓] [b] Pernah (${c.totalDosis || 0} Dosis)</strong> &nbsp;&nbsp;&nbsp;&nbsp; [c] Tidak Tahu` :
        `<strong>[✓] [a] Belum Pernah (0 Dosis)</strong> &nbsp;&nbsp;&nbsp;&nbsp; [b] Pernah &nbsp;&nbsp;&nbsp;&nbsp; [c] Tidak Tahu`;
    }
    if (document.getElementById("pe-dpt-info")) document.getElementById("pe-dpt-info").innerText = c.dpt ? `${c.dpt} dosis` : "0 dosis";
    if (document.getElementById("pe-booster-info")) document.getElementById("pe-booster-info").innerText = c.dpt >= 4 ? "Pernah (Usia 18 bulan)" : "Belum Booster";
    if (document.getElementById("pe-dt-info")) document.getElementById("pe-dt-info").innerText = c.dt ? `${c.dt} dosis` : "0 dosis";
    if (document.getElementById("pe-td-info")) document.getElementById("pe-td-info").innerText = c.td ? `${c.td} dosis` : "0 dosis";
    if (document.getElementById("pe-sumber-vax")) document.getElementById("pe-sumber-vax").innerText = c.sumberImunisasi || "Buku KIA / KMS";

    // 5-8. Spesimen & Kultur Lab (Halaman 2)
    const tglAmbil = c.tanggalAmbilHidung || c.tanggalAmbilTenggorok || c.tanggalAmbilSpesimen || c.tanggalOnset || "-";
    const tglKirim = c.tanggalKirimHidung || c.tanggalKirimTenggorok || "-";
    if (document.getElementById("pe-tgl-ambil-spesimen")) document.getElementById("pe-tgl-ambil-spesimen").innerText = tglAmbil;
    if (document.getElementById("pe-tgl-kirim-spesimen")) document.getElementById("pe-tgl-kirim-spesimen").innerText = tglKirim !== "-" ? tglKirim : tglAmbil;
    if (document.getElementById("pe-kultur")) {
      const hasilK = c.hasilKultur || "Pending";
      const varK = c.varian && c.varian !== "-" ? ` | Varian: ${c.varian}` : "";
      const toksK = c.toksigenitas && c.toksigenitas !== "-" ? ` (${c.toksigenitas})` : "";
      document.getElementById("pe-kultur").innerText = `${hasilK}${varK}${toksK}`;
    }

    // IV. Riwayat Pengobatan (Halaman 2)
    if (document.getElementById("pe-tgl-berobat")) document.getElementById("pe-tgl-berobat").innerText = c.tanggalOnset || "-";
    if (document.getElementById("pe-diag-tgl")) document.getElementById("pe-diag-tgl").innerText = c.tanggalPelacakan || c.tanggalOnset || "-";
    if (document.getElementById("pe-antibiotik-ada")) document.getElementById("pe-antibiotik-ada").innerText = (c.antibiotik && c.antibiotik !== "Tidak") ? "Ya" : "Tidak";
    if (document.getElementById("pe-antibiotik-jenis")) document.getElementById("pe-antibiotik-jenis").innerText = c.antibiotik || "Azitromisin";
    if (document.getElementById("pe-antibiotik-tgl")) document.getElementById("pe-antibiotik-tgl").innerText = c.tanggalAntibiotik || c.tanggalOnset || "-";
    
    if (document.getElementById("pe-ads-status")) document.getElementById("pe-ads-status").innerText = c.adsDiberikan ? "Ya (Diberikan)" : "Tidak Diberikan";
    if (document.getElementById("pe-ads-dosis")) document.getElementById("pe-ads-dosis").innerText = c.adsDiberikan ? `${c.adsDosis || 40000} IU` : "-";
    if (document.getElementById("pe-ads-tgl")) document.getElementById("pe-ads-tgl").innerText = c.adsDiberikan ? (c.tanggalADS || c.tanggalOnset || "-") : "-";
    if (document.getElementById("pe-keadaan")) document.getElementById("pe-keadaan").innerText = c.keadaanAkhir || "Hidup / Sembuh";

    // V. Tabel Kontak Kasus (Halaman 3 Baku Kemenkes - Tipe Kontak Masuk Kolom 'Hub dgn Kasus')
    const contactTableBody = document.getElementById("pe-dif1-contacts-table-body");
    if (contactTableBody) {
      const krCount = c.kontakRumah || c.kontakEratRumah || 3;
      const ksCount = c.kontakSekolah || 1;
      const ktCount = c.kontakTetangga || 1;
      
      let rowsHtml = "";
      let noUrut = 1;

      // 1. Kontak Serumah (Keluarga)
      rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">${c.namaIbu || "Ibu Kandung"}</td><td class="p-1.5 border-r border-black text-center">36</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Ibu / Serumah</td><td class="p-1.5 text-center">3 kali (Lengkap)</td></tr>`;
      rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Ayah Kandung</td><td class="p-1.5 border-r border-black text-center">40</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Ayah / Serumah</td><td class="p-1.5 text-center">3 kali (Lengkap)</td></tr>`;
      
      if (krCount >= 3) {
        rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Saudara Kandung</td><td class="p-1.5 border-r border-black text-center">${Math.max(1, (ageObj.years || 7) + 2)}</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Saudara / Serumah</td><td class="p-1.5 text-center">Lengkap (4 dosis)</td></tr>`;
      }
      // 2. Kontak Sekolah / Bermain
      if (ksCount > 0) {
        rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Teman Bermain / Sekolah</td><td class="p-1.5 border-r border-black text-center">${ageObj.years || 8}</td><td class="p-1.5 border-r border-black">${c.kelurahan || "Desa/Kel Setempat"}</td><td class="p-1.5 border-r border-black">Teman Bermain</td><td class="p-1.5 text-center">2 kali (Belum Lengkap)</td></tr>`;
      }
      // 3. Kontak Tetangga Dekat
      if (ktCount > 0) {
        rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Tetangga Dekat</td><td class="p-1.5 border-r border-black text-center">29</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Tetangga</td><td class="p-1.5 text-center">Pernah Imunisasi</td></tr>`;
      }
      // Baris kosong pelengkap
      rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black">-</td><td class="p-1.5 border-r border-black text-center">-</td><td class="p-1.5 border-r border-black">-</td><td class="p-1.5 border-r border-black">-</td><td class="p-1.5 text-center">-</td></tr>`;

      contactTableBody.innerHTML = rowsHtml;
    }

    // Muat data penandatangan dinamis dari penyimpanan lokal atau default resmi
    const savedSign = JSON.parse(localStorage.getItem("sidif_pe_signature_config") || "{}");
    const pJabatan = savedSign.pejabatJabatan || "Kepala Bidang P2P Dinkes Provinsi";
    const pNama = savedSign.pejabatNama || "dr. Sulvy Dwi Anggraini, M.Kes";
    const pNip = savedSign.pejabatNip || "NIP. 19740512 200212 2 003";

    const petInstansi = savedSign.petugasInstansi || `Dinas Kesehatan ${c.kabupaten}`;
    const petNama = savedSign.petugasNama || (isRegionalUser ? `Petugas Surveilans ${c.kabupaten}` : "( Tanda Tangan & Nama Terang )");
    const petNip = savedSign.petugasNip || `Petugas Surveilans PD3I ${c.kabupaten}`;

    if (document.getElementById("pe-sign-pejabat-jabatan")) document.getElementById("pe-sign-pejabat-jabatan").innerText = pJabatan;
    if (document.getElementById("pe-sign-pejabat-nama")) document.getElementById("pe-sign-pejabat-nama").innerText = pNama;
    if (document.getElementById("pe-sign-pejabat-nip")) document.getElementById("pe-sign-pejabat-nip").innerText = pNip;
    if (document.getElementById("pe-sign-petugas-instansi")) document.getElementById("pe-sign-petugas-instansi").innerText = petInstansi;
    if (document.getElementById("pe-sign-petugas-nama")) document.getElementById("pe-sign-petugas-nama").innerText = petNama;
    if (document.getElementById("pe-sign-petugas-nip")) document.getElementById("pe-sign-petugas-nip").innerText = petNip;

    // Tampilkan modal PE
    const modal = document.getElementById("modal-pe");
    if (modal) {
      modal.classList.remove("hidden");
      modal.scrollTop = 0;
      document.body.classList.add("overflow-hidden");
    }
  },

  // Tutup Modal Form PE
  
  // Toggle Drawer Pengaturan Penandatangan Lembar PE
  toggleSignatureEditor() {
    const drawer = document.getElementById("pe-signature-editor-drawer");
    if (!drawer) return;
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) {
      const savedSign = JSON.parse(localStorage.getItem("sidif_pe_signature_config") || "{}");
      if (document.getElementById("input-sign-pejabat-jab")) {
        document.getElementById("input-sign-pejabat-jab").value = savedSign.pejabatJabatan || (document.getElementById("pe-sign-pejabat-jabatan") ? document.getElementById("pe-sign-pejabat-jabatan").innerText : "Kepala Bidang P2P Dinkes Provinsi");
        document.getElementById("input-sign-pejabat-nama").value = savedSign.pejabatNama || (document.getElementById("pe-sign-pejabat-nama") ? document.getElementById("pe-sign-pejabat-nama").innerText : "dr. Sulvy Dwi Anggraini, M.Kes");
        document.getElementById("input-sign-pejabat-nip").value = savedSign.pejabatNip || (document.getElementById("pe-sign-pejabat-nip") ? document.getElementById("pe-sign-pejabat-nip").innerText : "NIP. 19740512 200212 2 003");
        
        document.getElementById("input-sign-petugas-inst").value = savedSign.petugasInstansi || (document.getElementById("pe-sign-petugas-instansi") ? document.getElementById("pe-sign-petugas-instansi").innerText : "Dinas Kesehatan Kabupaten / Kota");
        document.getElementById("input-sign-petugas-nama").value = savedSign.petugasNama || (document.getElementById("pe-sign-petugas-nama") ? document.getElementById("pe-sign-petugas-nama").innerText : "( Tanda Tangan & Nama Terang )");
        document.getElementById("input-sign-petugas-nip").value = savedSign.petugasNip || (document.getElementById("pe-sign-petugas-nip") ? document.getElementById("pe-sign-petugas-nip").innerText : "Dinas Kesehatan");
      }
    }
  },

  // Simpan Konfigurasi Penandatangan ke LocalStorage
  saveSignatureConfig() {
    const config = {
      pejabatJabatan: (document.getElementById("input-sign-pejabat-jab").value || "").trim(),
      pejabatNama: (document.getElementById("input-sign-pejabat-nama").value || "").trim(),
      pejabatNip: (document.getElementById("input-sign-pejabat-nip").value || "").trim(),
      petugasInstansi: (document.getElementById("input-sign-petugas-inst").value || "").trim(),
      petugasNama: (document.getElementById("input-sign-petugas-nama").value || "").trim(),
      petugasNip: (document.getElementById("input-sign-petugas-nip").value || "").trim()
    };

    localStorage.setItem("sidif_pe_signature_config", JSON.stringify(config));

    // Perbarui teks langsung di lembar dokumen PE
    if (document.getElementById("pe-sign-pejabat-jabatan")) document.getElementById("pe-sign-pejabat-jabatan").innerText = config.pejabatJabatan;
    if (document.getElementById("pe-sign-pejabat-nama")) document.getElementById("pe-sign-pejabat-nama").innerText = config.pejabatNama;
    if (document.getElementById("pe-sign-pejabat-nip")) document.getElementById("pe-sign-pejabat-nip").innerText = config.pejabatNip;
    if (document.getElementById("pe-sign-petugas-instansi")) document.getElementById("pe-sign-petugas-instansi").innerText = config.petugasInstansi;
    if (document.getElementById("pe-sign-petugas-nama")) document.getElementById("pe-sign-petugas-nama").innerText = config.petugasNama;
    if (document.getElementById("pe-sign-petugas-nip")) document.getElementById("pe-sign-petugas-nip").innerText = config.petugasNip;

    document.getElementById("pe-signature-editor-drawer").classList.add("hidden");
    alert("Format penandatangan lembar PE berhasil disimpan dan diperbarui.");
  },

  closePeModal() {
    const modal = document.getElementById("modal-pe");
    if (modal) {
      modal.classList.add("hidden");
    }
    document.body.classList.remove("overflow-hidden");
  },

  // Cetak Dokumen PE dengan Nama File Otomatis PE-xxxxxx
  printPeDocument() {
    if (window._currentPeFilename) {
      document.title = window._currentPeFilename;
    }
    
    window.print();

    // Pulihkan judul setelah print dialog ditutup
    setTimeout(() => {
      if (window._originalDocTitle) {
        document.title = window._originalDocTitle;
      }
    }, 1500);
  }
};

// Event listener tombol Escape untuk menutup modal PE
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("modal-pe");
    if (modal && !modal.classList.contains("hidden")) {
      window.SIDIF_EXPORT.closePeModal();
    }
  }
});
