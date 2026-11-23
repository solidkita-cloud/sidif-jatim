/**
 * SIDIF JAWA TIMUR - SMART EXCEL IMPORTER & DATABASE RESET MODULE
 * Membaca berkas Excel (.xlsx / .xls) master Form DIF-3 atau format SIDIPro Dinkes Jatim
 * Mendukung Smart Auto-Mapping kolom, validasi data, pratonton (preview),
 * serta opsi Tambah Kasus (Append) atau Timpa Total (Reset Database).
 */

window.SIDIF_IMPORT = {
  pendingCases: [],
  detectedSummary: null,

  // 1. Unduh Template Excel Kosong Resmi Form DIF-3
  downloadImportTemplate() {
    if (typeof XLSX === "undefined") {
      alert("Pustaka Excel belum siap. Silakan muat ulang halaman.");
      return;
    }

    const sampleRows = [
      {
        "No": 1,
        "Nomor Epidemiologi": "130126001",
        "Nama Lengkap Pasien": "Ahmad Dani (Contoh)",
        "Pekerjaan": "Pelajar",
        "No. Telepon / WA": "081234567890",
        "Tinggi Badan (cm)": 120,
        "Berat Badan (kg)": 22,
        "Umur (Tahun)": 6,
        "Umur (Bulan)": 0,
        "Jenis Kelamin (L/P)": "L",
        "Alamat (Desa/Kel./RT/RW)": "Desa Manyar RT 02 RW 01",
        "Kecamatan": "Manyar",
        "Kabupaten / Kota": "Kabupaten Gresik",
        "Provinsi": "Jawa Timur",
        "Tanggal Mulai Sakit (Onset)": "2026-03-01",
        "Gejala: Demam": "Ya",
        "Gejala: Nyeri Telan": "Ya",
        "Gejala: Leher Bengkak / Bullneck": "Tidak",
        "Gejala: Pseudomembran": "Ya",
        "Gejala Lainnya": "-",
        "Riwayat DPT (Usia 2,3,4, 18 Bln)": "3",
        "Riwayat DT (Kelas 1 SD/MI)": "1",
        "Riwayat Td (Kelas 2 & 5 SD/MI)": "0",
        "Status Imunisasi Kemenkes": "Lengkap",
        "Tanggal Terakhir Vaksinasi": "2024-11-12",
        "Sumber Informasi Imunisasi": "Buku KIA / KMS",
        "Sumber Laporan": "Puskesmas",
        "Tanggal Laporan Diterima": "2026-03-03",
        "Tanggal Pelacakan Laporan (PE)": "2026-03-04",
        "Hasil Kultur Lab": "Positif",
        "Varian C. diphtheriae": "Mitis",
        "Uji Toksigenitas": "Positif",
        "Ada Hubungan Epidemiologi": "Tidak",
        "Pemberian Terapi ADS": "Ya",
        "Dosis ADS (IU)": "40000",
        "Pemberian Antibiotik": "Eritromisin",
        "Kontak Rumah (KR)": 4,
        "Profilaksis Rumah": 4,
        "Kontak Sekolah (KS)": 15,
        "Profilaksis Sekolah": 15,
        "Kontak Tetangga (KT)": 0,
        "Profilaksis Tetangga": 0,
        "Kontak Bermain (KB)": 0,
        "Profilaksis Bermain": 0,
        "Keadaan Akhir Pasien": "Hidup / Sembuh",
        "Keterangan Surveilans": "Kasus terkonfirmasi klaster sekolah"
      },
      {
        "No": 2,
        "Nomor Epidemiologi": "130226001",
        "Nama Lengkap Pasien": "Siti Nurhaliza (Contoh)",
        "Pekerjaan": "Belum Bekerja",
        "No. Telepon / WA": "085678901234",
        "Tinggi Badan (cm)": 95,
        "Berat Badan (kg)": 14,
        "Umur (Tahun)": 3,
        "Umur (Bulan)": 4,
        "Jenis Kelamin (L/P)": "P",
        "Alamat (Desa/Kel./RT/RW)": "Kelurahan Pucang RT 01 RW 04",
        "Kecamatan": "Sidoarjo",
        "Kabupaten / Kota": "Kabupaten Sidoarjo",
        "Provinsi": "Jawa Timur",
        "Tanggal Mulai Sakit (Onset)": "2026-03-05",
        "Gejala: Demam": "Ya",
        "Gejala: Nyeri Telan": "Ya",
        "Gejala: Leher Bengkak / Bullneck": "Ya",
        "Gejala: Pseudomembran": "Ya",
        "Gejala Lainnya": "Stridor ringan",
        "Riwayat DPT (Usia 2,3,4, 18 Bln)": "1",
        "Riwayat DT (Kelas 1 SD/MI)": "0",
        "Riwayat Td (Kelas 2 & 5 SD/MI)": "0",
        "Status Imunisasi Kemenkes": "Belum Lengkap",
        "Tanggal Terakhir Vaksinasi": "2023-08-20",
        "Sumber Informasi Imunisasi": "Ingatan Orang Tua",
        "Sumber Laporan": "RSUD Sidoarjo",
        "Tanggal Laporan Diterima": "2026-03-06",
        "Tanggal Pelacakan Laporan (PE)": "2026-03-06",
        "Hasil Kultur Lab": "Negatif",
        "Varian C. diphtheriae": "-",
        "Uji Toksigenitas": "-",
        "Ada Hubungan Epidemiologi": "Tidak",
        "Pemberian Terapi ADS": "Ya",
        "Dosis ADS (IU)": "60000",
        "Pemberian Antibiotik": "Eritromisin",
        "Kontak Rumah (KR)": 3,
        "Profilaksis Rumah": 3,
        "Kontak Sekolah (KS)": 0,
        "Profilaksis Sekolah": 0,
        "Kontak Tetangga (KT)": 2,
        "Profilaksis Tetangga": 2,
        "Kontak Bermain (KB)": 0,
        "Profilaksis Bermain": 0,
        "Keadaan Akhir Pasien": "Hidup / Sembuh",
        "Keterangan Surveilans": "Kompatibel Klinis"
      }
    ];

    const instructions = [
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "" },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "1. Format ini sesuai dengan master Form DIF-3 Kemenkes RI & rekapan SIDIPro Dinkes Jawa Timur." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "2. Baris data kasus dimulai pada Sheet 'List Kasus' atau 'Data Kasus'." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "3. Kolom wajib: Nomor Epidemiologi, Nama Pasien, Kabupaten/Kota, Tanggal Onset, dan Hasil Kultur Lab." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "4. Hasil Kultur Lab: isi dengan 'Positif', 'Negatif', atau 'Pending / Belum Diperiksa'." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "5. Terapi ADS: isi 'Ya' jika diberikan, atau 'Tidak'." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "6. Kontak Erat: isi angka jumlah orang untuk Kontak Rumah, Sekolah, Tetangga, dan Bermain." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "7. Keadaan Akhir: isi 'Hidup / Sembuh' atau 'Meninggal Dunia'." },
      { "PANDUAN PENGISIAN TEMPLATE EXCEL MASTER KASUS DIFTERI (E-SIDIF JATIM)": "8. File dapat diunggah melalui tombol 'Impor File Excel & Reset Database' di menu Super Admin." }
    ];

    const wb = XLSX.utils.book_new();
    const wsInstr = XLSX.utils.json_to_sheet(instructions, { skipHeader: true });
    const wsData = XLSX.utils.json_to_sheet(sampleRows);

    XLSX.utils.book_append_sheet(wb, wsInstr, "Petunjuk Pengisian");
    XLSX.utils.book_append_sheet(wb, wsData, "List Kasus Master");

    XLSX.writeFile(wb, "Template_Master_Kasus_DIF-3_Jatim.xlsx");
  },

  // 2. Baca Berkas Excel yang Dipilih Pengguna
  handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const self = this;

    reader.onload = function(e) {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        self.parseWorkbook(workbook, file.name);
      } catch (err) {
        console.error("Gagal membaca berkas Excel:", err);
        alert("Gagal membaca berkas Excel. Pastikan file berformat .xlsx atau .xls yang valid.");
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input agar bisa upload file yang sama jika perlu
    event.target.value = "";
  },

  // 3. Mesin Parsing Cerdas (Smart Column Auto-Mapper)
  parseWorkbook(workbook, fileName) {
    // Cari sheet yang memuat kata 'kasus', 'list', 'data', 'asli', atau gunakan sheet pertama
    let targetSheetName = workbook.SheetNames[0];
    for (const s of workbook.SheetNames) {
      const lower = s.toLowerCase();
      if (lower.includes("list kasus") || lower.includes("kasus") || lower.includes("data") || lower.includes("asli")) {
        targetSheetName = s;
        break;
      }
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      alert(`Sheet tidak ditemukan pada berkas ${fileName}.`);
      return;
    }

    // Ubah sheet menjadi array 2D
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rawRows || rawRows.length === 0) {
      alert("Berkas Excel kosong atau tidak memiliki baris data.");
      return;
    }

    // Deteksi baris header (mencari baris yang memuat 'nama', 'epid', 'kabupaten', atau 'no')
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(20, rawRows.length); r++) {
      const row = rawRows[r].map(c => String(c).trim().toLowerCase());
      const hasEpid = row.some(c => c.includes("epid") || c.includes("nomor"));
      const hasNama = row.some(c => c.includes("nama"));
      const hasKab = row.some(c => c.includes("kabupaten") || c.includes("kota") || c.includes("kab/kota"));
      if ((hasEpid && hasNama) || (hasNama && hasKab)) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0; // Default baris pertama
    }

    const headers = rawRows[headerRowIdx].map(h => String(h).trim());
    const dataRows = rawRows.slice(headerRowIdx + 1);

    // Bangun pemetaan indeks kolom dengan Sinonim Fleksibel
    const colMap = {};
    headers.forEach((h, idx) => {
      const clean = h.toLowerCase().replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ");

      if (/no\b|nomor$/i.test(clean) && !clean.includes("epid") && !clean.includes("tel")) colMap.no = idx;
      if (/epid/i.test(clean)) colMap.noEpid = idx;
      if (/nama/i.test(clean) && !clean.includes("pengirim") && !clean.includes("kantor")) colMap.nama = idx;
      if (/pekerjaan/i.test(clean)) colMap.pekerjaan = idx;
      if (/telepon|telp|hp|wa/i.test(clean)) colMap.telepon = idx;
      if (/tinggi\s*badan|tb/i.test(clean)) colMap.tinggiBadan = idx;
      if (/berat\s*badan|bb/i.test(clean)) colMap.beratBadan = idx;
      if (/umur.*tahun|usia.*tahun/i.test(clean) || clean === "thn" || clean === "tahun") colMap.umurTahun = idx;
      if (/umur.*bulan|usia.*bulan/i.test(clean) || clean === "bln" || clean === "bulan") colMap.umurBulan = idx;
      if ((/umur|usia/i.test(clean)) && colMap.umurTahun === undefined) colMap.umur = idx;
      if (/jenis\s*kelamin|gender|jk|l\/p/i.test(clean)) colMap.jenisKelamin = idx;
      if (/alamat|desa|kelurahan/i.test(clean)) colMap.alamat = idx;
      if (/kecamatan|kec\b/i.test(clean)) colMap.kecamatan = idx;
      if (/kabupaten|kota|kab\/kota/i.test(clean) && !clean.includes("provinsi")) colMap.kabupaten = idx;
      if (/provinsi/i.test(clean)) colMap.provinsi = idx;
      if (/onset|mulai\s*sakit/i.test(clean)) colMap.tanggalOnset = idx;
      if (/laporan\s*diterima/i.test(clean)) colMap.tanggalLaporanDiterima = idx;
      if (/pelacakan|tgl\s*pe/i.test(clean)) colMap.tanggalPelacakan = idx;
      if (/sumber\s*lapor/i.test(clean)) colMap.sumberLaporan = idx;

      // Gejala
      if (/demam/i.test(clean)) colMap.demam = idx;
      if (/nyeri\s*telan|sakit\s*tenggorok/i.test(clean)) colMap.nyeriMenelan = idx;
      if (/bullneck|leher\s*bengkak/i.test(clean)) colMap.bullneck = idx;
      if (/pseudo/i.test(clean)) colMap.pseudomembran = idx;
      if (/gejala\s*lain/i.test(clean)) colMap.gejalaLain = idx;

      // Imunisasi
      if (/\bdpt\b|dpt/i.test(clean)) colMap.dpt = idx;
      if (/\bdt\b|dt/i.test(clean)) colMap.dt = idx;
      if (/\btd\b|td/i.test(clean)) colMap.td = idx;
      if (/status\s*imunisasi/i.test(clean)) colMap.statusImunisasi = idx;
      if (/sumber\s*imunisasi|sumber\s*informasi/i.test(clean)) colMap.sumberImunisasi = idx;

      // Lab
      if (/kultur\s*hidung/i.test(clean)) colMap.hasilKulturHidung = idx;
      if (/kultur\s*tenggorok/i.test(clean)) colMap.hasilKulturTenggorok = idx;
      if (/hasil\s*kultur|kultur\s*lab|status\s*konfirmasi/i.test(clean) && colMap.hasilKultur === undefined) colMap.hasilKultur = idx;
      if (/varian/i.test(clean)) colMap.varian = idx;
      if (/toksigen/i.test(clean)) colMap.toksigenitas = idx;
      if (/hubungan\s*epi/i.test(clean)) colMap.hubunganEpidemiologi = idx;
      if (/klasifikasi/i.test(clean)) colMap.klasifikasiKlinis = idx;

      // Tatalaksana
      if (/ads/i.test(clean) && !clean.includes("dosis")) colMap.adsDiberikan = idx;
      if (/dosis\s*ads/i.test(clean)) colMap.adsDosis = idx;
      if (/antibiotik|jenis\s*ab/i.test(clean)) colMap.antibiotik = idx;
      if (/obat\s*lain/i.test(clean)) colMap.obatLain = idx;

      // Kontak Erat
      if (/ke\s*rumah|kontak.*rumah|serumah/i.test(clean) && !clean.includes("prof")) colMap.kontakRumah = idx;
      if (/prof.*rumah|profilaksis.*rumah/i.test(clean)) colMap.profilaksisRumah = idx;
      if (/ke\s*sekolah|kontak.*sekolah|kerja/i.test(clean) && !clean.includes("prof")) colMap.kontakSekolah = idx;
      if (/prof.*sekolah|profilaksis.*sekolah/i.test(clean)) colMap.profilaksisSekolah = idx;
      if (/ke\s*tetangga|kontak.*tetangga/i.test(clean) && !clean.includes("prof")) colMap.kontakTetangga = idx;
      if (/prof.*tetangga|profilaksis.*tetangga/i.test(clean)) colMap.profilaksisTetangga = idx;
      if (/ke\s*bermain|kontak.*bermain/i.test(clean) && !clean.includes("prof")) colMap.kontakBermain = idx;
      if (/prof.*bermain|profilaksis.*bermain/i.test(clean)) colMap.profilaksisBermain = idx;

      // Akhir
      if (/kondisi|keadaan\s*akhir|status\s*akhir/i.test(clean)) colMap.keadaanAkhir = idx;
      if (/keterangan/i.test(clean)) colMap.keterangan = idx;
    });

    const parsedCases = [];
    const kabKotaCount = new Set();
    let positifCount = 0;
    let meninggalCount = 0;
    let adsCount = 0;

    const parseBool = (val) => {
      if (typeof val === "boolean") return val;
      const s = String(val).trim().toLowerCase();
      return s === "ya" || s === "1" || s === "true" || s === "y" || s === "positif";
    };

    const parseIntSafe = (val, def = 0) => {
      const n = parseInt(val, 10);
      return isNaN(n) ? def : n;
    };

    const formatDateSafe = (val) => {
      if (!val) return new Date().toISOString().slice(0, 10);
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      if (typeof val === "number") {
        // Excel serial date format
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      }
      return String(val).trim().slice(0, 10);
    };

    dataRows.forEach((row, rowIdx) => {
      const rawNama = colMap.nama !== undefined ? String(row[colMap.nama] || "").trim() : "";
      const rawKab = colMap.kabupaten !== undefined ? String(row[colMap.kabupaten] || "").trim() : "";
      const rawEpid = colMap.noEpid !== undefined ? String(row[colMap.noEpid] || "").trim() : "";

      // Lewati baris kosong jika tidak ada nama dan no epid
      if (!rawNama && !rawEpid) return;
      if (rawNama === "0" && rawEpid === "0") return;

      const kabupatenClean = rawKab || "Kabupaten Jombang";
      kabKotaCount.add(kabupatenClean);

      // Kultur lab
      let kulturVal = "Pending";
      const rawKultur = colMap.hasilKultur !== undefined ? String(row[colMap.hasilKultur] || "").trim().toLowerCase() : "";
      const rawHidung = colMap.hasilKulturHidung !== undefined ? String(row[colMap.hasilKulturHidung] || "").trim().toLowerCase() : "";
      const rawTenggorok = colMap.hasilKulturTenggorok !== undefined ? String(row[colMap.hasilKulturTenggorok] || "").trim().toLowerCase() : "";

      if (rawKultur.includes("positif") || rawHidung.includes("positif") || rawTenggorok.includes("positif")) {
        kulturVal = "Positif";
        positifCount++;
      } else if (rawKultur.includes("negatif") || (rawHidung.includes("negatif") && rawTenggorok.includes("negatif"))) {
        kulturVal = "Negatif";
      }

      // ADS
      const isAds = colMap.adsDiberikan !== undefined ? parseBool(row[colMap.adsDiberikan]) : false;
      if (isAds) adsCount++;

      // Keadaan akhir
      const rawAkhir = colMap.keadaanAkhir !== undefined ? String(row[colMap.keadaanAkhir] || "").toLowerCase() : "";
      const isMeninggal = rawAkhir.includes("meninggal") || rawAkhir.includes("mati");
      if (isMeninggal) meninggalCount++;

      // Kontak Erat
      const kr = parseIntSafe(colMap.kontakRumah !== undefined ? row[colMap.kontakRumah] : 3, 3);
      const ks = parseIntSafe(colMap.kontakSekolah !== undefined ? row[colMap.kontakSekolah] : 0, 0);
      const kt = parseIntSafe(colMap.kontakTetangga !== undefined ? row[colMap.kontakTetangga] : 0, 0);
      const kb = parseIntSafe(colMap.kontakBermain !== undefined ? row[colMap.kontakBermain] : 0, 0);

      const prKr = parseIntSafe(colMap.profilaksisRumah !== undefined ? row[colMap.profilaksisRumah] : kr, kr);
      const prKs = parseIntSafe(colMap.profilaksisSekolah !== undefined ? row[colMap.profilaksisSekolah] : ks, ks);
      const prKt = parseIntSafe(colMap.profilaksisTetangga !== undefined ? row[colMap.profilaksisTetangga] : kt, kt);
      const prKb = parseIntSafe(colMap.profilaksisBermain !== undefined ? row[colMap.profilaksisBermain] : kb, kb);

      // Usia
      let umur = 5;
      if (colMap.umurTahun !== undefined && row[colMap.umurTahun] !== "") {
        umur = parseIntSafe(row[colMap.umurTahun], 5);
      } else if (colMap.umur !== undefined && row[colMap.umur] !== "") {
        umur = parseIntSafe(row[colMap.umur], 5);
      }

      // Imunisasi
      const dpt = parseIntSafe(colMap.dpt !== undefined ? row[colMap.dpt] : 0, 0);
      const dt = parseIntSafe(colMap.dt !== undefined ? row[colMap.dt] : 0, 0);
      const td = parseIntSafe(colMap.td !== undefined ? row[colMap.td] : 0, 0);
      const totDosis = dpt + dt + td;

      let statusIm = colMap.statusImunisasi !== undefined ? String(row[colMap.statusImunisasi] || "").trim() : "";
      if (!statusIm) {
        if (totDosis >= 3) statusIm = "Lengkap";
        else if (totDosis > 0) statusIm = "Belum Lengkap";
        else statusIm = "Tidak Diimunisasi";
      }

      const caseObj = {
        id: "case-imp-" + Date.now() + "-" + (rowIdx + 1),
        noEpid: rawEpid || `130026${String(rowIdx + 1).padStart(3, "0")}`,
        nama: rawNama || `Pasien Difteri #${rowIdx + 1}`,
        pekerjaan: colMap.pekerjaan !== undefined ? String(row[colMap.pekerjaan] || "-") : "-",
        telepon: colMap.telepon !== undefined ? String(row[colMap.telepon] || "-") : "-",
        tinggiBadan: colMap.tinggiBadan !== undefined ? (parseInt(row[colMap.tinggiBadan], 10) || null) : null,
        beratBadan: colMap.beratBadan !== undefined ? (parseInt(row[colMap.beratBadan], 10) || null) : null,
        umur: umur,
        umurTahun: umur,
        umurBulan: colMap.umurBulan !== undefined ? parseIntSafe(row[colMap.umurBulan], 0) : 0,
        jenisKelamin: colMap.jenisKelamin !== undefined ? (String(row[colMap.jenisKelamin]).toUpperCase().startsWith("P") ? "P" : "L") : "L",
        alamat: colMap.alamat !== undefined ? String(row[colMap.alamat] || "-") : "-",
        kecamatan: colMap.kecamatan !== undefined ? String(row[colMap.kecamatan] || "-") : "-",
        kabupaten: kabupatenClean,
        provinsi: colMap.provinsi !== undefined ? String(row[colMap.provinsi] || "Jawa Timur") : "Jawa Timur",
        tanggalOnset: colMap.tanggalOnset !== undefined ? formatDateSafe(row[colMap.tanggalOnset]) : "2026-03-01",
        tanggalLaporanDiterima: colMap.tanggalLaporanDiterima !== undefined ? formatDateSafe(row[colMap.tanggalLaporanDiterima]) : "2026-03-02",
        tanggalPelacakan: colMap.tanggalPelacakan !== undefined ? formatDateSafe(row[colMap.tanggalPelacakan]) : "2026-03-03",
        sumberLaporan: colMap.sumberLaporan !== undefined ? String(row[colMap.sumberLaporan] || "Puskesmas") : "Puskesmas",

        demam: colMap.demam !== undefined ? parseBool(row[colMap.demam]) : true,
        nyeriMenelan: colMap.nyeriMenelan !== undefined ? parseBool(row[colMap.nyeriMenelan]) : true,
        bullneck: colMap.bullneck !== undefined ? parseBool(row[colMap.bullneck]) : false,
        pseudomembran: colMap.pseudomembran !== undefined ? parseBool(row[colMap.pseudomembran]) : true,
        gejalaLain: colMap.gejalaLain !== undefined ? String(row[colMap.gejalaLain] || "-") : "-",

        dpt: String(dpt),
        dt: String(dt),
        td: String(td),
        totalDosis: totDosis,
        statusImunisasi: statusIm,
        sumberImunisasi: colMap.sumberImunisasi !== undefined ? String(row[colMap.sumberImunisasi] || "Buku KIA / KMS") : "Buku KIA / KMS",

        hasilKultur: kulturVal,
        hasilKulturHidung: kulturVal,
        hasilKulturTenggorok: kulturVal,
        varian: colMap.varian !== undefined ? String(row[colMap.varian] || "-") : (kulturVal === "Positif" ? "Mitis" : "-"),
        toksigenitas: colMap.toksigenitas !== undefined ? String(row[colMap.toksigenitas] || "-") : (kulturVal === "Positif" ? "Positif" : "-"),
        hubunganEpidemiologi: colMap.hubunganEpidemiologi !== undefined ? parseBool(row[colMap.hubunganEpidemiologi]) : false,
        klasifikasiKlinis: kulturVal === "Positif" ? "Difteri Konfirmasi Lab" : "Kompatibel Klinis",

        adsDiberikan: isAds,
        adsDosis: colMap.adsDosis !== undefined ? String(row[colMap.adsDosis] || "40000") : "40000",
        antibiotik: colMap.antibiotik !== undefined ? String(row[colMap.antibiotik] || "Eritromisin") : "Eritromisin",
        obatLain: colMap.obatLain !== undefined ? String(row[colMap.obatLain] || "-") : "-",

        kontakRumah: kr,
        kontakSekolah: ks,
        kontakTetangga: kt,
        kontakBermain: kb,
        totalKontak: kr + ks + kt + kb,

        profilaksisRumah: prKr,
        profilaksisSekolah: prKs,
        profilaksisTetangga: prKt,
        profilaksisBermain: prKb,
        totalProfilaksis: prKr + prKs + prKt + prKb,

        kontakEratRumah: kr,
        kontakEratProfilaksis: prKr,

        keadaanAkhir: isMeninggal ? "Meninggal Dunia" : "Hidup / Sembuh",
        keterangan: colMap.keterangan !== undefined ? String(row[colMap.keterangan] || "Data Diimpor dari Excel") : "Data Diimpor dari Excel",
        statusAdmin: "Terverifikasi",
        createdAt: new Date().toISOString(),
        createdBy: "SUPERADMIN_IMPORT",
        deletedAt: null
      };

      parsedCases.push(caseObj);
    });

    if (parsedCases.length === 0) {
      alert("Tidak ditemukan baris data kasus difteri yang valid pada berkas Excel.");
      return;
    }

    this.pendingCases = parsedCases;
    this.detectedSummary = {
      fileName,
      sheetName: targetSheetName,
      totalCases: parsedCases.length,
      totalKabKota: kabKotaCount.size,
      positifCount,
      meninggalCount,
      adsCount
    };

    // Tampilkan Modal Pratonton (Preview)
    this.showImportPreviewModal();
  },

  // 4. Buka Modal Pratonton Sebelum Eksekusi Impor
  showImportPreviewModal() {
    const modal = document.getElementById("modal-import-preview");
    if (!modal) return;

    const s = this.detectedSummary;
    const fmt = (n) => (n || 0).toLocaleString("id-ID");

    const elFile = document.getElementById("import-preview-file");
    const elTotal = document.getElementById("import-preview-total");
    const elKab = document.getElementById("import-preview-kab");
    const elPos = document.getElementById("import-preview-positif");
    const elDeath = document.getElementById("import-preview-death");
    const elAds = document.getElementById("import-preview-ads");
    const elTbody = document.getElementById("import-preview-tbody");

    if (elFile) elFile.innerText = `${s.fileName} (Sheet: ${s.sheetName})`;
    if (elTotal) elTotal.innerText = `${fmt(s.totalCases)} Kasus`;
    if (elKab) elKab.innerText = `${fmt(s.totalKabKota)} Kab/Kota Terdeteksi`;
    if (elPos) elPos.innerText = `${fmt(s.positifCount)} Kasus Positif Lab`;
    if (elDeath) elDeath.innerText = `${fmt(s.meninggalCount)} Kasus Meninggal`;
    if (elAds) elAds.innerText = `${fmt(s.adsCount)} Kasus Diberi ADS`;

    if (elTbody) {
      const sample = this.pendingCases.slice(0, 5);
      elTbody.innerHTML = sample.map((c, i) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 text-[11px]">
          <td class="p-2 font-mono font-bold text-slate-700">${i + 1}</td>
          <td class="p-2 font-mono text-emerald-800 font-bold">${c.noEpid}</td>
          <td class="p-2 font-bold text-slate-900">${c.nama}</td>
          <td class="p-2 text-slate-600">${c.kabupaten}</td>
          <td class="p-2 text-center font-bold ${c.hasilKultur === 'Positif' ? 'text-red-600' : 'text-slate-600'}">${c.hasilKultur}</td>
          <td class="p-2 text-center ${c.adsDiberikan ? 'text-blue-700 font-bold' : 'text-slate-400'}">${c.adsDiberikan ? 'Ya' : 'Tidak'}</td>
          <td class="p-2 text-center font-bold text-slate-800">${c.totalKontak} org</td>
        </tr>
      `).join("");
    }

    modal.classList.remove("hidden");
  },

  // 5. Eksekusi Penggantian Data (Timpa Total vs Gabungkan)
  executeImport(mode = "replace") {
    if (!this.pendingCases || this.pendingCases.length === 0) {
      alert("Tidak ada data kasus yang siap diimpor.");
      return;
    }

    const fmt = (n) => (n || 0).toLocaleString("id-ID");
    const totalNew = this.pendingCases.length;

    if (mode === "replace") {
      const confirmReset = confirm(
        `PERINGATAN RESET DATABASE TOTAL!\n\n` +
        `Anda akan MENGHAPUS SEMUA DATA KASUS LAMA dan MENGGANTINYA DENGAN ${fmt(totalNew)} KASUS DARI EXCEL.\n\n` +
        `Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan?`
      );
      if (!confirmReset) return;

      // Timpa total localStorage
      localStorage.setItem("sidif_cases_v4", JSON.stringify(this.pendingCases));
      localStorage.setItem("sidif_migration_v4_applied", "true");

      if (window.SIDIF_STORE && window.SIDIF_STORE.logAudit) {
        window.SIDIF_STORE.logAudit(
          "SUPERADMIN_RESET",
          "DATABASE_RESET_FROM_EXCEL",
          `Reset database total dan mengganti dengan ${totalNew} kasus dari berkas ${this.detectedSummary.fileName}`
        );
      }

      alert(`BERHASIL RESET TOTAL!\n\nDatabase telah diperbarui dengan ${fmt(totalNew)} kasus difteri baru dari berkas Excel. Seluruh peta, kurva, dan KPI telah disinkronkan.`);

    } else {
      // Gabungkan (Append)
      const existing = window.SIDIF_STORE ? window.SIDIF_STORE.getCases() : [];
      const merged = existing.concat(this.pendingCases);

      localStorage.setItem("sidif_cases_v4", JSON.stringify(merged));
      localStorage.setItem("sidif_migration_v4_applied", "true");

      if (window.SIDIF_STORE && window.SIDIF_STORE.logAudit) {
        window.SIDIF_STORE.logAudit(
          "SUPERADMIN_APPEND",
          "DATABASE_APPEND_FROM_EXCEL",
          `Menambahkan ${totalNew} kasus dari berkas ${this.detectedSummary.fileName} ke database yang sudah ada.`
        );
      }

      alert(`BERHASIL MENAMBAHKAN KASUS!\n\nSebanyak ${fmt(totalNew)} kasus baru telah ditambahkan ke database. Total kasus saat ini: ${fmt(merged.length)} kasus.`);
    }

    // Tutup modal
    const modal = document.getElementById("modal-import-preview");
    if (modal) modal.classList.add("hidden");

    const modalExport = document.getElementById("modal-superadmin-export");
    if (modalExport) modalExport.classList.add("hidden");

    // Sinkronkan ke Firebase jika terhubung
    if (window.SIDIF_FIREBASE_SYNC && window.SIDIF_FIREBASE_SYNC.syncAllLocalToCloud) {
      window.SIDIF_FIREBASE_SYNC.syncAllLocalToCloud().catch(e => console.warn("Firebase sync background:", e));
    }

    // Refresh Dashboard, Peta, Tabel, dan Grafik
    if (window.SIDIF_APP) {
      window.SIDIF_APP.applyDashboardFilters();
      if (window.SIDIF_MAP && window.SIDIF_MAP.applyFilter) {
        const y = document.getElementById("filter-tahun")?.value || "2026";
        const m = document.getElementById("filter-bulan")?.value || "all";
        window.SIDIF_MAP.applyFilter(y, m);
      }
      if (window.SIDIF_APP.renderCasesTable) {
        window.SIDIF_APP.renderCasesTable();
      }
    }
  }
};
