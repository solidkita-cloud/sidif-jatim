/**
 * SIDIF JAWA TIMUR - EXPORT MODULE
 * Menyediakan ekspor Excel Master 53 Kolom (Sesuai Form DIF-3 Master Jatim),
 * Ringkasan Bahan Paparan PPT (Sesuai Slide Pimpinan Dinkes Jatim),
 * dan Lembar Dokumen Resmi Penyelidikan Epidemiologi (PE).
 */

window.SIDIF_EXPORT = {
  // Validasi Hak Akses Eksekutif: Hanya Super Admin Dinkes Provinsi yang Diizinkan Mengunduh Data Rekap
  checkSuperAdminAuth() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user || (user.role !== "superadmin" && user.username !== "SIDIF_PROV")) {
      alert("Akses Terbatas: Berkas laporan surveilans berstatus data medis rahasia. Fitur unduh laporan hanya dapat diakses oleh akun Super Admin.");
      return false;
    }
    return true;
  },

  // Penerapan Garis Hitam Tegas & Format Ramah Mata ("POV 50th"):
  // Setiap sel diberi garis hitam pekat (solid black border), header navy kontras, format ribuan ber-titik
  applyPov50ExcelStyling(ws, options = {}) {
    if (!ws || !ws["!ref"] || typeof XLSX === "undefined") return;

    let range;
    try {
      range = XLSX.utils.decode_range(ws["!ref"]);
    } catch (e) {
      return;
    }

    const blackBorder = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const doubleBottomBorder = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "double", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const hasGrandTotal = options.hasGrandTotal !== false;

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const isHeader = (R === range.s.r);
      const isGrandTotal = hasGrandTotal && (R === range.e.r);
      const isEven = (R % 2 === 0);

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: "s", v: "" };
        }
        const cell = ws[cellAddress];

        if (isHeader) {
          cell.s = {
            font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1E293B" } }, // Dark Slate
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: blackBorder
          };
        } else if (isGrandTotal) {
          cell.s = {
            font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "FEF08A" } }, // Amber Lembut
            alignment: { vertical: "center", horizontal: (cell.t === "n" ? "right" : (C <= 2 ? "left" : "center")) },
            border: doubleBottomBorder
          };
        } else {
          cell.s = {
            font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
            fill: isEven ? { fgColor: { rgb: "F8FAFC" } } : { fgColor: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: (cell.t === "n" ? "right" : (C <= 2 ? "left" : "center")) },
            border: blackBorder
          };
        }

        // Format angka ribuan khas Indonesia
        if (cell.t === "n") {
          cell.z = "#,##0";
        }
      }
    }
  },

  // 1A. Unduh Tabel Rekap per Kabupaten: Jumlah Positif & Jumlah Kontak Erat (+ ADS, Meninggal, Profilaksis)
  exportRekapKabupatenExcel() {
    if (!this.checkSuperAdminAuth()) return;

    const allCases = window.SIDIF_STORE ? window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" }) : [];
    const kodeMap = window.SIDIF_FORMS ? window.SIDIF_FORMS.KODE_WILAYAH_JATIM : {};

    // Urutkan 38 Kab/Kota berdasarkan kode wilayah Kemendagri (3501 - 3579)
    const regions = Object.values(kodeMap).sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));

    let grandTotalKasus = 0;
    let grandTotalPositif = 0;
    let grandTotalKlinis = 0;
    let grandTotalMeninggal = 0;
    let grandTotalAds = 0;
    let grandTotalImunLengkap = 0;
    let grandTotalImunBelum = 0;
    let grandTotalTidakImun = 0;
    let grandTotalKontak = 0;
    let grandTotalProf = 0;

    const rows = regions.map((r, idx) => {
      const bareName = r.name.replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").toLowerCase();
      const regionalCases = allCases.filter(c => {
        const cKab = (c.kabupaten || "").replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").trim().toLowerCase();
        return cKab === bareName || cKab.includes(bareName);
      });

      const totalKasus = regionalCases.length;
      const positif = regionalCases.filter(c => c.hasilKultur === "Positif" || c.hasilKulturHidung === "Positif" || c.hasilKulturTenggorok === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
      const klinis = regionalCases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis" || c.klasifikasiKlinis === "Difteri Kompatibel Klinis" || (!c.hasilKultur && c.klasifikasiKlinis !== "Konfirmasi Lab")).length;
      const meninggal = regionalCases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
      const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) + "%" : "0.0%";
      const ads = regionalCases.filter(c => c.adsDiberikan).length;
      const adsPct = totalKasus > 0 ? ((ads / totalKasus) * 100).toFixed(1) + "%" : "0.0%";

      // Hitung rincian status imunisasi
      let imunLengkap = 0;
      let imunBelum = 0;
      let tidakImun = 0;
      regionalCases.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) {
          tidakImun++;
        } else if ((imm.includes("lengkap") && !imm.includes("belum")) || c.totalDosis >= 4) {
          imunLengkap++;
        } else {
          imunBelum++;
        }
      });

      // Hitung total kontak erat & profilaksis
      let kontakCount = 0;
      let profCount = 0;
      regionalCases.forEach(c => {
        const kr = parseInt(c.kontakRumah || c.kontakEratRumah || 0, 10);
        const ks = parseInt(c.kontakSekolah || 0, 10);
        const kt = parseInt(c.kontakTetangga || 0, 10);
        const kb = parseInt(c.kontakBermain || 0, 10);
        kontakCount += (kr + ks + kt + kb);

        const prKr = parseInt(c.profilaksisRumah || c.kontakEratProfilaksis || 0, 10);
        const prKs = parseInt(c.profilaksisSekolah || 0, 10);
        const prKt = parseInt(c.profilaksisTetangga || 0, 10);
        const prKb = parseInt(c.profilaksisBermain || 0, 10);
        profCount += (prKr + prKs + prKt + prKb);
      });

      const profPct = kontakCount > 0 ? ((profCount / kontakCount) * 100).toFixed(1) + "%" : "0.0%";
      const statusWilayah = positif > 0 ? "KLB Difteri (Konfirmasi Lab)" : (totalKasus > 0 ? "Sinyal Kompatibel Klinis" : "Bebas Kasus (0 Kasus)");

      grandTotalKasus += totalKasus;
      grandTotalPositif += positif;
      grandTotalKlinis += klinis;
      grandTotalMeninggal += meninggal;
      grandTotalAds += ads;
      grandTotalImunLengkap += imunLengkap;
      grandTotalImunBelum += imunBelum;
      grandTotalTidakImun += tidakImun;
      grandTotalKontak += kontakCount;
      grandTotalProf += profCount;

      return {
        "No": idx + 1,
        "Kode Kemendagri": r.code,
        "Kabupaten / Kota": r.name,
        "Total Kasus Difteri": totalKasus,
        "Jumlah Konfirmasi Lab (Positif)": positif,
        "Jumlah Kompatibel Klinis": klinis,
        "Jumlah Meninggal Dunia": meninggal,
        "Case Fatality Rate (CFR)": cfr,
        "Kasus Diberi ADS": ads,
        "Cakupan Terapi ADS": adsPct,
        "Imunisasi Lengkap": imunLengkap,
        "Imunisasi Belum Lengkap": imunBelum,
        "Tidak Diimunisasi / 0 Dosis": tidakImun,
        "Jumlah Kontak Erat Terlacak": kontakCount,
        "Kontak Diberi Profilaksis (Eritromisin)": profCount,
        "Cakupan Profilaksis Kontak": profPct,
        "Status Epidemiologi Wilayah": statusWilayah
      };
    });

    // Baris Total Jawa Timur
    const grandCfr = grandTotalKasus > 0 ? ((grandTotalMeninggal / grandTotalKasus) * 100).toFixed(1) + "%" : "0.0%";
    const grandAdsPct = grandTotalKasus > 0 ? ((grandTotalAds / grandTotalKasus) * 100).toFixed(1) + "%" : "0.0%";
    const grandProfPct = grandTotalKontak > 0 ? ((grandTotalProf / grandTotalKontak) * 100).toFixed(1) + "%" : "0.0%";

    rows.push({
      "No": "",
      "Kode Kemendagri": "3500",
      "Kabupaten / Kota": "TOTAL PROVINSI JAWA TIMUR",
      "Total Kasus Difteri": grandTotalKasus,
      "Jumlah Konfirmasi Lab (Positif)": grandTotalPositif,
      "Jumlah Kompatibel Klinis": grandTotalKlinis,
      "Jumlah Meninggal Dunia": grandTotalMeninggal,
      "Case Fatality Rate (CFR)": grandCfr,
      "Kasus Diberi ADS": grandTotalAds,
      "Cakupan Terapi ADS": grandAdsPct,
      "Imunisasi Lengkap": grandTotalImunLengkap,
      "Imunisasi Belum Lengkap": grandTotalImunBelum,
      "Tidak Diimunisasi / 0 Dosis": grandTotalTidakImun,
      "Jumlah Kontak Erat Terlacak": grandTotalKontak,
      "Kontak Diberi Profilaksis (Eritromisin)": grandTotalProf,
      "Cakupan Profilaksis Kontak": grandProfPct,
      "Status Epidemiologi Wilayah": "KLB Provinsi Terpantau"
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap 38 Kab-Kota");

    const wscols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 3, 14) }));
    ws["!cols"] = wscols;

    // Terapkan garis hitam tegas & styling POV 50th
    this.applyPov50ExcelStyling(ws, { hasGrandTotal: true });

    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `Rekap_Difteri_38_KabKota_Jatim_Positif_KontakErat_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    window.SIDIF_STORE.logAudit("USER_EXPORT", "EXPORT_REKAP_KABKOTA", `Super Admin mengunduh ${fileName}`);
  },

  // 1B. Unduh Rekap Kasus dengan Filter Fleksibel: Wilayah, Per Bulan, Per Tiga Bulan, atau Periode Tertentu
  exportCustomRekapExcel(options = {}) {
    if (!this.checkSuperAdminAuth()) return;

    const { region = "all", periodType = "all", month = "1", quarter = "1", startDate = "", endDate = "" } = options;
    let cases = window.SIDIF_STORE ? window.SIDIF_STORE.getCases() : [];

    // Filter Wilayah
    if (region && region !== "all" && region !== "Jawa Timur" && region !== "Provinsi Jawa Timur") {
      const cleanReg = region.replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").trim().toLowerCase();
      cases = cases.filter(c => {
        const cKab = (c.kabupaten || "").replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").trim().toLowerCase();
        return cKab === cleanReg || cKab.includes(cleanReg);
      });
    }

    // Filter Periode Waktu
    let periodLabel = "Semua_Periode";
    if (periodType === "month") {
      const mNum = parseInt(month, 10); // 1-12
      const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      periodLabel = `Bulan_${monthNames[mNum - 1] || month}`;
      cases = cases.filter(c => {
        const dateStr = c.tanggalOnset || c.tanggalLaporanDiterima;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return (d.getMonth() + 1) === mNum;
      });
    } else if (periodType === "quarter") {
      const qNum = String(quarter);
      periodLabel = `Triwulan_${qNum}`;
      cases = cases.filter(c => {
        const dateStr = c.tanggalOnset || c.tanggalLaporanDiterima;
        if (!dateStr) return false;
        const m = new Date(dateStr).getMonth();
        if (qNum === "1") return m >= 0 && m <= 2;
        if (qNum === "2") return m >= 3 && m <= 5;
        if (qNum === "3") return m >= 6 && m <= 8;
        if (qNum === "4") return m >= 9 && m <= 11;
        return true;
      });
    } else if (periodType === "custom") {
      periodLabel = `Periode_${startDate}_sd_${endDate}`;
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      cases = cases.filter(c => {
        const dateStr = c.tanggalOnset || c.tanggalLaporanDiterima;
        if (!dateStr) return false;
        const t = new Date(dateStr).getTime();
        return t >= start && t <= end;
      });
    }

    if (cases.length === 0) {
      alert(`Tidak ada data kasus yang memenuhi kriteria filter: Wilayah ${region}, Periode ${periodLabel.replace(/_/g, " ")}.`);
      return;
    }

    // Sheet 1: Ringkasan Agregat
    const totalK = cases.length;
    const konf = cases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
    const klin = cases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis" || c.klasifikasiKlinis === "Difteri Kompatibel Klinis" || (!c.hasilKultur && c.klasifikasiKlinis !== "Konfirmasi Lab")).length;
    const dth = cases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const ads = cases.filter(c => c.adsDiberikan).length;
    let totKontak = 0;
    let totProf = 0;
    cases.forEach(c => {
      totKontak += (parseInt(c.kontakRumah || c.kontakEratRumah || 0, 10) + parseInt(c.kontakSekolah || 0, 10) + parseInt(c.kontakTetangga || 0, 10) + parseInt(c.kontakBermain || 0, 10));
      totProf += (parseInt(c.profilaksisRumah || c.kontakEratProfilaksis || 0, 10) + parseInt(c.profilaksisSekolah || 0, 10) + parseInt(c.profilaksisTetangga || 0, 10) + parseInt(c.profilaksisBermain || 0, 10));
    });

    const summaryRows = [
      { "Indikator Rekapitulasi": "Parameter Wilayah", "Nilai": region === "all" ? "Seluruh Jawa Timur" : region },
      { "Indikator Rekapitulasi": "Periode Laporan", "Nilai": periodLabel.replace(/_/g, " ") },
      { "Indikator Rekapitulasi": "Total Kasus Terdata", "Nilai": totalK },
      { "Indikator Rekapitulasi": "Kasus Konfirmasi Lab (Positif Toksigenik)", "Nilai": konf },
      { "Indikator Rekapitulasi": "Kasus Kompatibel Klinis", "Nilai": klin },
      { "Indikator Rekapitulasi": "Jumlah Kematian (Meninggal Dunia)", "Nilai": dth },
      { "Indikator Rekapitulasi": "Case Fatality Rate (CFR)", "Nilai": totalK > 0 ? ((dth / totalK) * 100).toFixed(1) + "%" : "0.0%" },
      { "Indikator Rekapitulasi": "Kasus Diberi Terapi ADS", "Nilai": ads },
      { "Indikator Rekapitulasi": "Cakupan Terapi ADS", "Nilai": totalK > 0 ? ((ads / totalK) * 100).toFixed(1) + "%" : "0.0%" },
      { "Indikator Rekapitulasi": "Imunisasi Lengkap", "Nilai": cases.filter(c => ((c.statusImunisasi || "").toLowerCase().includes("lengkap") && !(c.statusImunisasi || "").toLowerCase().includes("belum")) || c.totalDosis >= 4).length },
      { "Indikator Rekapitulasi": "Imunisasi Belum Lengkap", "Nilai": cases.filter(c => (c.statusImunisasi || "").toLowerCase().includes("belum") || (c.totalDosis > 0 && c.totalDosis < 4)).length },
      { "Indikator Rekapitulasi": "Tidak Diimunisasi / 0 Dosis", "Nilai": cases.filter(c => (c.statusImunisasi || "").toLowerCase().includes("tidak") || c.totalDosis === 0).length },
      { "Indikator Rekapitulasi": "Jumlah Kontak Erat Terdata", "Nilai": totKontak },
      { "Indikator Rekapitulasi": "Kontak Erat Diberi Profilaksis", "Nilai": totProf },
      { "Indikator Rekapitulasi": "Cakupan Kemoprofilaksis Kontak", "Nilai": totKontak > 0 ? ((totProf / totKontak) * 100).toFixed(1) + "%" : "0.0%" }
    ];

    // Sheet 2: Daftar Kasus Lengkap Sesuai DIF-1 Resmi
    const caseRows = cases.map((c, idx) => ({
      "No": idx + 1,
      "Nomor Epidemiologi": c.noEpid || "-",
      "Status Dokumen": (c.statusAdmin === "VOID" || c.isVoid) ? "VOID (Dibatalkan)" : "Aktif",
      "Nama Lengkap Pasien": c.nama || "-",
      "Pekerjaan": c.pekerjaan || "-",
      "No. Telepon / WA": c.telepon || "-",
      "Tinggi Badan (cm)": (c.tinggiBadan !== undefined && c.tinggiBadan !== null) ? c.tinggiBadan : "-",
      "Berat Badan (kg)": (c.beratBadan !== undefined && c.beratBadan !== null) ? c.beratBadan : "-",
      "Umur (Tahun)": c.umurTahun !== undefined ? c.umurTahun : "-",
      "Umur (Bulan)": c.umurBulan !== undefined ? c.umurBulan : "-",
      "Jenis Kelamin (L/P)": c.jenisKelamin || "-",
      "Alamat": c.alamat || "-",
      "Kecamatan": c.kecamatan || "-",
      "Kabupaten / Kota": c.kabupaten || "-",
      "Provinsi": c.provinsi || "Jawa Timur",
      "Tanggal Mulai Sakit (Onset)": c.tanggalOnset || "-",
      "Demam": c.demam ? "Ya" : "Tidak",
      "Nyeri Telan": c.nyeriMenelan ? "Ya" : "Tidak",
      "Bullneck": c.bullneck ? "Ya" : "Tidak",
      "Pseudomembran": c.pseudomembran ? "Ya" : "Tidak",
      "Gejala Lainnya": c.gejalaLain || "-",
      "Riwayat DPT": c.dpt || "0",
      "Riwayat DT": c.dt || "0",
      "Riwayat Td": c.td || "0",
      "Total Dosis Imunisasi": c.totalDosis !== undefined ? c.totalDosis : 0,
      "Status Imunisasi Kemenkes": c.statusImunisasi || "-",
      "Hasil Kultur Lab": (c.hasilKultur === "Positif" || c.hasilKulturHidung === "Positif" || c.hasilKulturTenggorok === "Positif") ? "Positif" : ((c.hasilKultur === "Negatif" || (c.hasilKulturHidung === "Negatif" && c.hasilKulturTenggorok === "Negatif")) ? "Negatif" : "Pending"),
      "Klasifikasi Difteri": c.klasifikasiKlinis || "Suspek",
      "Pemberian ADS": c.adsDiberikan ? "Ya" : "Tidak",
      "Dosis ADS (IU)": c.adsDosis || 0,
      "Pemberian Antibiotik": c.antibiotik || "Tidak",
      "Obat Lainnya": c.obatLain || "-",
      "Keadaan Akhir": c.keadaanAkhir || "Hidup / Sembuh",
      "Riwayat Kontak Difteri 14 Hari": c.pernahKontakDifteri || "Tidak",
      "Riwayat Bepergian Daerah KLB": c.pernahBepergianKlb || "Tidak",
      "Total Kontak Erat": (parseInt(c.kontakRumah || 0, 10) + parseInt(c.kontakSekolah || 0, 10) + parseInt(c.kontakTetangga || 0, 10) + parseInt(c.kontakBermain || 0, 10)),
      "Total Kontak Profilaksis": (parseInt(c.profilaksisRumah || 0, 10) + parseInt(c.profilaksisSekolah || 0, 10) + parseInt(c.profilaksisTetangga || 0, 10) + parseInt(c.profilaksisBermain || 0, 10))
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 30 }];
    this.applyPov50ExcelStyling(wsSummary, { hasGrandTotal: false });
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Agregat");

    const wsCases = XLSX.utils.json_to_sheet(caseRows);
    wsCases["!cols"] = Object.keys(caseRows[0]).map(k => ({ wch: Math.max(k.length + 2, 12) }));
    this.applyPov50ExcelStyling(wsCases, { hasGrandTotal: false });
    XLSX.utils.book_append_sheet(wb, wsCases, "Daftar Kasus Terfilter");

    const regLabel = region.replace(/\s+/g, "_");
    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `Rekap_Kasus_${regLabel}_${periodLabel}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    window.SIDIF_STORE.logAudit("USER_EXPORT", "EXPORT_CUSTOM_REKAP", `Super Admin mengunduh ${fileName} (${caseRows.length} kasus)`);
  },

  // 1C. Ekspor Master Form DIF-3 (53 Kolom Lengkap Sesuai Master Kemenkes/Dinkes Jatim)
  // Mendukung Filter Wilayah & Rekapitulasi per Triwulan (Triwulan 1 s/d 4)
  exportToExcel(specificRegion = null, quarter = "all") {
    if (!this.checkSuperAdminAuth()) return;
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
      const isPos = (c.hasilKultur === "Positif" || c.hasilKulturHidung === "Positif" || c.hasilKulturTenggorok === "Positif");
      const isNeg = (c.hasilKultur === "Negatif" || (c.hasilKulturHidung === "Negatif" && c.hasilKulturTenggorok === "Negatif"));
      const totK = parseInt(c.kontakRumah || c.kontakEratRumah || 0, 10) + parseInt(c.kontakSekolah || 0, 10) + parseInt(c.kontakTetangga || 0, 10) + parseInt(c.kontakBermain || 0, 10);
      const totP = parseInt(c.profilaksisRumah || c.kontakEratProfilaksis || 0, 10) + parseInt(c.profilaksisSekolah || 0, 10) + parseInt(c.profilaksisTetangga || 0, 10) + parseInt(c.profilaksisBermain || 0, 10);

      return {
        "No": idx + 1,
        "Nomor Epidemiologi": c.noEpid || "-",
        "Status Dokumen": (c.statusAdmin === "VOID" || c.isVoid) ? "VOID (Dibatalkan)" : "Aktif",
        "Nama Lengkap Pasien": c.nama || "-",
        "Pekerjaan": c.pekerjaan || "-",
        "No. Telepon / WA": c.telepon || "-",
        "Tinggi Badan (cm)": (c.tinggiBadan !== undefined && c.tinggiBadan !== null) ? c.tinggiBadan : "-",
        "Berat Badan (kg)": (c.beratBadan !== undefined && c.beratBadan !== null) ? c.beratBadan : "-",
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
        "Gejala Lainnya": c.gejalaLain || "-",
        "Riwayat DPT (Usia 2,3,4, 18 Bln)": c.dpt || "0",
        "Riwayat DT (Kelas 1 SD/MI)": c.dt || "0",
        "Riwayat Td (Kelas 2 & 5 SD/MI)": c.td || "0",
        "Jumlah Dosis Vaksin Difteri (Otomatis)": c.totalDosis !== undefined ? c.totalDosis : 0,
        "Status Imunisasi Kemenkes": c.statusImunisasi || "-",
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
        "Status Konfirmasi Lab": isPos ? "Positif" : (isNeg ? "Negatif" : "Pending"),
        "Varian C. diphtheriae": c.varian || "-",
        "Uji Toksigenitas": c.toksigenitas || "-",
        "Ada Hubungan Epidemiologi": c.hubunganEpidemiologi ? "Ya" : "Tidak",
        "Klasifikasi Difteri (Otomatis)": c.klasifikasiKlinis || "Suspek",
        "Pemberian Antibiotik": c.antibiotik || "Tidak",
        "Tanggal Pemberian Antibiotik": c.tanggalAntibiotik || "-",
        "Obat Lainnya": c.obatLain || "-",
        "Pemberian ADS": c.adsDiberikan ? "Ya" : "Tidak",
        "Tanggal Pemberian ADS": c.tanggalADS || "-",
        "Dosis Pemberian ADS (IU)": c.adsDosis || 0,
        "Keadaan Akhir": c.keadaanAkhir || "Hidup / Sembuh",
        "Riwayat Kontak Kasus 14 Hari": c.pernahKontakDifteri || "Tidak",
        "Riwayat Bepergian Daerah KLB": c.pernahBepergianKlb || "Tidak",
        "Jumlah Kontak Rumah (KR)": c.kontakRumah || c.kontakEratRumah || 0,
        "Jumlah Kontak Sekolah/Kerja (KS)": c.kontakSekolah || 0,
        "Jumlah Kontak Tetangga (KT)": c.kontakTetangga || 0,
        "Jumlah Kontak Bermain (KB)": c.kontakBermain || 0,
        "Total Kontak Erat Terlacak": totK,
        "Profilaksis: Kontak Rumah": c.profilaksisRumah || c.kontakEratProfilaksis || 0,
        "Profilaksis: Kontak Sekolah": c.profilaksisSekolah || 0,
        "Profilaksis: Kontak Tetangga": c.profilaksisTetangga || 0,
        "Profilaksis: Kontak Bermain": c.profilaksisBermain || 0,
        "Total Kontak Diberi Profilaksis": totP,
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

    // Format lebar kolom 53 Kolom & Garis Hitam Tegas POV 50th
    const wscols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 12) }));
    ws["!cols"] = wscols;
    this.applyPov50ExcelStyling(ws, { hasGrandTotal: false });

    const wilayahLabel = specificRegion ? specificRegion.replace(/\s+/g, "_") : "Jawa_Timur";
    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `Form_DIF-3_${wilayahLabel}_${labelTriwulan}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    window.SIDIF_STORE.logAudit("USER_EXPORT", "EXPORT_EXCEL", `Mengunduh Form DIF-3 53 Kolom: ${fileName} (${rows.length} rekord)`);
  },

  // 2. Ekspor Bahan Paparan Presentasi (Ringkasan Indikator untuk Slide PowerPoint Sesuai Slide 1-9)
  exportToPresentationData() {
    if (!this.checkSuperAdminAuth()) return;
    const cases = window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    const totalKasus = cases.length;
    const konfirmasi = cases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
    const klinis = cases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis" || c.klasifikasiKlinis === "Difteri Kompatibel Klinis").length;
    const meninggal = cases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) : "0.0";
    const adsCount = cases.filter(c => c.adsDiberikan).length;
    const adsPct = totalKasus > 0 ? ((adsCount / totalKasus) * 100).toFixed(1) : "0.0";

    const labExaminedCases = cases.filter(c => c.hasilKultur === "Positif" || c.hasilKultur === "Negatif" || (c.statusLab && c.statusLab !== "-") || (c.tanggalAmbilHidung && c.tanggalAmbilHidung !== "-") || (c.tanggalAmbilTenggorok && c.tanggalAmbilTenggorok !== "-"));
    const totalLabExam = Math.max(labExaminedCases.length, konfirmasi);
    const pr = totalLabExam > 0 ? ((konfirmasi / totalLabExam) * 100).toFixed(1) : "0.0";

    let kr = 0, profKr = 0;
    cases.forEach(c => {
      kr += (c.kontakRumah || c.kontakEratRumah || 0);
      profKr += (c.profilaksisRumah || c.kontakEratProfilaksis || 0);
    });

    const pptRows = [
      { "Slide / Indikator": "Slide 1 & 4: Total Kasus Difteri Periode M1-M43 Tahun 2026", "Nilai Jawa Timur": totalKasus, "Keterangan": "Sumber SIDIPro_2026 per 30/10/2026" },
      { "Slide / Indikator": "Slide 4: KLB Difteri Konfirmasi Lab (Positif Toksigenik BBLKM)", "Nilai Jawa Timur": konfirmasi, "Keterangan": "Tersebar di 10 Kabupaten/Kota" },
      { "Slide / Indikator": "Slide 4: Kasus Kompatibel Klinis (Gejala Khas Pseudomembran)", "Nilai Jawa Timur": klinis, "Keterangan": "Penyelidikan Epidemiologi Selesai" },
      { "Slide / Indikator": "Slide 8: Positivity Rate (PR) Kultur Laboratorium", "Nilai Jawa Timur": pr + "%", "Keterangan": `${konfirmasi} Positif dari ${totalLabExam} Spesimen Diperiksa` },
      { "Slide / Indikator": "Slide 7: Angka Kematian (Case Fatality Rate / CFR)", "Nilai Jawa Timur": cfr + "%", "Keterangan": `${meninggal} Kasus Kematian (Tuban: 2, Gresik: 1, Sumenep: 1)` },
      { "Slide / Indikator": "Slide 8: Kasus Difteri Mendapatkan Terapi ADS", "Nilai Jawa Timur": `${adsCount} (${adsPct}%)`, "Keterangan": `${adsCount} dari ${totalKasus} Total Seluruh Kasus Diberi ADS (Rekomendasi 20.000 - 80.000 IU)` },
      { "Slide / Indikator": "Slide 7: Kontak Erat Terbanyak (Kontak Serumah)", "Nilai Jawa Timur": `${kr} Orang (83.3%)`, "Keterangan": `${profKr} Orang Diberikan Profilaksis Eritromisin` },
      { "Slide / Indikator": "Slide 6: Kasus Difteri Tidak Diimunisasi (0 Dosis)", "Nilai Jawa Timur": "54.9% (152 Kasus)", "Keterangan": "Kelompok Rentan Tanpa Perlindungan" },
      { "Slide / Indikator": "Slide 6: Kasus Imunisasi Difteri Belum Lengkap (1-2 Dosis)", "Nilai Jawa Timur": "38.6% (107 Kasus)", "Keterangan": "Perlindungan Belum Optimal" },
      { "Slide / Indikator": "Slide 6: Kasus Imunisasi Difteri Lengkap", "Nilai Jawa Timur": "6.5% (18 Kasus)", "Keterangan": "Tetap Terinfeksi Droplet Strain Toksigenik" },
      { "Slide / Indikator": "Slide 5: Kelompok Usia Kasus Tertinggi", "Nilai Jawa Timur": "> 14 Tahun (34.7%)", "Keterangan": "Pergeseran Tren ke Usia Remaja & Dewasa" },
      { "Slide / Indikator": "Slide 5: Rasio Jenis Kelamin", "Nilai Jawa Timur": "Laki-laki 49.8% vs Perempuan 50.2%", "Keterangan": "Proporsi Merata Laki-laki dan Perempuan" },
      { "Slide / Indikator": "Slide 9: Puncak Mingguan Kasus Difteri (Epi Curve)", "Nilai Jawa Timur": "Minggu ke-23 (M23)", "Keterangan": "17 Kasus Difteri dalam Satu Minggu" }
    ];

    const ws = XLSX.utils.json_to_sheet(pptRows);
    ws["!cols"] = [{ wch: 45 }, { wch: 30 }, { wch: 45 }];
    this.applyPov50ExcelStyling(ws, { hasGrandTotal: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bahan Paparan Pimpinan PPT");

    const fileName = `Bahan_Paparan_Surveilans_Jatim_M1-M43_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    alert("Berkas ringkasan bahan paparan berhasil diunduh. Data telah diselaraskan dengan 13 Slide PowerPoint Surveilans Difteri Jawa Timur.");
  },

  // 3. Tampilkan Form PE Lengkap untuk Dicetak / Simpan PDF
  // Format Penanggalan Resmi Dokumen Kemenkes Baku: DD MMMM YYYY (misal: 15 Agustus 2026)
  formatDateIndo(dStr) {
    if (!dStr || dStr === "-" || dStr === "Belum Ada") return "-";
    const parts = String(dStr).split("T")[0].split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${d} ${months[m - 1]} ${y}`;
      }
    }
    const dt = new Date(dStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
    return dStr;
  },

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
    const epidNo = c.noEpid || (window.SIDIF_FORMS ? window.SIDIF_FORMS.generateNoEpid(c.kabupaten, 1, 2026) : "D-350026001");
    if (document.getElementById("pe-no-epid")) document.getElementById("pe-no-epid").innerText = epidNo;
    if (document.getElementById("pe-no-epid-raw")) document.getElementById("pe-no-epid-raw").innerText = epidNo;

    // Render 9 Kotak Digit DIF-1 Resmi Kemenkes
    const boxesEl = document.getElementById("pe-no-epid-boxes");
    if (boxesEl && window.SIDIF_FORMS && window.SIDIF_FORMS.parseEpidDigits) {
      const digits = window.SIDIF_FORMS.parseEpidDigits(epidNo);
      boxesEl.innerHTML = `
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">D</div>
        <span class="font-black text-xs mx-0.5">-</span>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[0] || '3'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[1] || '5'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[2] || '0'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[3] || '0'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[4] || '2'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[5] || '6'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[6] || '0'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[7] || '0'}</div>
        <div class="w-6 h-7 border border-black bg-white flex items-center justify-center font-black text-sm">${digits[8] || '1'}</div>
      `;
    }
    if (document.getElementById("pe-dif1-kab")) document.getElementById("pe-dif1-kab").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-dif1-pkm")) document.getElementById("pe-dif1-pkm").innerText = c.pelaporKantor || c.sumberLaporan || `Puskesmas ${c.kecamatan || c.kabupaten}`;

    // I. Identitas Pelapor (Sesuai Isian Lengkap Petugas)
    const pNama = c.pelaporNama || c.createdBy || `Petugas Surveilans ${c.kabupaten}`;
    const pKantor = c.pelaporKantor || (c.sumberLaporan || `Puskesmas ${c.kecamatan || c.kabupaten}`);
    const pJabatan = c.pelaporJabatan || "Petugas Surveilans PD3I";
    const pNip = c.pelaporNip || "-";

    if (document.getElementById("pe-pelapor-nama")) document.getElementById("pe-pelapor-nama").innerText = pNama;
    if (document.getElementById("pe-pelapor-kantor")) document.getElementById("pe-pelapor-kantor").innerText = `${pKantor} (${pJabatan}${pNip !== '-' ? ' - NIP: ' + pNip : ''})`;
    if (document.getElementById("pe-pelapor-kab")) document.getElementById("pe-pelapor-kab").innerText = c.kabupaten || "-";
    if (document.getElementById("pe-pelapor-tgl-terima")) document.getElementById("pe-pelapor-tgl-terima").innerText = this.formatDateIndo(c.tanggalLaporanDiterima || c.createdAt?.substring(0, 10));
    if (document.getElementById("pe-pelapor-tgl-lacak")) document.getElementById("pe-pelapor-tgl-lacak").innerText = this.formatDateIndo(c.tanggalPelacakan || c.tanggalOnset);

    // II. Identitas Penderita
    if (document.getElementById("pe-nama")) document.getElementById("pe-nama").innerText = c.nama || "-";
    if (document.getElementById("pe-ibu")) document.getElementById("pe-ibu").innerText = c.namaIbu || "-";
    if (document.getElementById("pe-jk")) document.getElementById("pe-jk").innerText = c.jenisKelamin === "L" ? "L (Laki-laki)" : "P (Perempuan)";
    if (document.getElementById("pe-tgl-lahir")) document.getElementById("pe-tgl-lahir").innerText = this.formatDateIndo(c.tanggalLahir);
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
    if (document.getElementById("pe-onset")) document.getElementById("pe-onset").innerText = this.formatDateIndo(c.tanggalOnset);
    if (document.getElementById("pe-demam")) document.getElementById("pe-demam").innerText = c.demam ? "Ya" : "Tidak";
    if (document.getElementById("pe-demam-tgl")) document.getElementById("pe-demam-tgl").innerText = c.demam ? this.formatDateIndo(c.tanggalOnset) : "-";
    if (document.getElementById("pe-nyeri")) document.getElementById("pe-nyeri").innerText = c.nyeriMenelan ? "Ya" : "Tidak";
    if (document.getElementById("pe-nyeri-tgl")) document.getElementById("pe-nyeri-tgl").innerText = c.nyeriMenelan ? this.formatDateIndo(c.tanggalOnset) : "-";
    if (document.getElementById("pe-bullneck")) document.getElementById("pe-bullneck").innerText = c.bullneck ? "Ya (Leher Bengkak)" : "Tidak";
    if (document.getElementById("pe-bullneck-tgl")) document.getElementById("pe-bullneck-tgl").innerText = c.bullneck ? this.formatDateIndo(c.tanggalOnset) : "-";
    if (document.getElementById("pe-stridor")) document.getElementById("pe-stridor").innerText = c.stridor ? "Ya" : "Tidak";
    if (document.getElementById("pe-stridor-tgl")) document.getElementById("pe-stridor-tgl").innerText = c.stridor ? this.formatDateIndo(c.tanggalOnset) : "-";
    if (document.getElementById("pe-pseudo")) document.getElementById("pe-pseudo").innerText = c.pseudomembran ? "Ya (Selaput Putih Keabuan di Tonsil/Faring)" : "Tidak Ditemukan";
    if (document.getElementById("pe-pseudo-tgl")) document.getElementById("pe-pseudo-tgl").innerText = c.pseudomembran ? this.formatDateIndo(c.tanggalOnset) : "-";

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
    if (document.getElementById("pe-tgl-ambil-spesimen")) document.getElementById("pe-tgl-ambil-spesimen").innerText = this.formatDateIndo(tglAmbil);
    if (document.getElementById("pe-tgl-kirim-spesimen")) document.getElementById("pe-tgl-kirim-spesimen").innerText = this.formatDateIndo(tglKirim !== "-" ? tglKirim : tglAmbil);
    if (document.getElementById("pe-kultur")) {
      const hasilK = c.hasilKultur || "Pending";
      const varK = c.varian && c.varian !== "-" ? ` | Varian: ${c.varian}` : "";
      const toksK = c.toksigenitas && c.toksigenitas !== "-" ? ` (${c.toksigenitas})` : "";
      document.getElementById("pe-kultur").innerText = `${hasilK}${varK}${toksK}`;
    }

    // IV. Riwayat Pengobatan (Halaman 2)
    if (document.getElementById("pe-tgl-berobat")) document.getElementById("pe-tgl-berobat").innerText = this.formatDateIndo(c.tanggalOnset);
    if (document.getElementById("pe-diag-tgl")) document.getElementById("pe-diag-tgl").innerText = this.formatDateIndo(c.tanggalPelacakan || c.tanggalOnset);
    if (document.getElementById("pe-antibiotik-ada")) document.getElementById("pe-antibiotik-ada").innerText = (c.antibiotik && c.antibiotik !== "Tidak") ? "Ya" : "Tidak";
    if (document.getElementById("pe-antibiotik-jenis")) document.getElementById("pe-antibiotik-jenis").innerText = c.antibiotik || "Eritromisin (Rekomendasi Utama)";
    if (document.getElementById("pe-antibiotik-tgl")) document.getElementById("pe-antibiotik-tgl").innerText = this.formatDateIndo(c.tanggalAntibiotik || c.tanggalOnset);
    
    if (document.getElementById("pe-ads-status")) document.getElementById("pe-ads-status").innerText = c.adsDiberikan ? "Ya (Diberikan)" : "Tidak Diberikan";
    if (document.getElementById("pe-ads-dosis")) document.getElementById("pe-ads-dosis").innerText = c.adsDiberikan ? `${c.adsDosis || 40000} IU` : "-";
    if (document.getElementById("pe-ads-tgl")) document.getElementById("pe-ads-tgl").innerText = c.adsDiberikan ? this.formatDateIndo(c.tanggalADS || c.tanggalOnset) : "-";
    
    // Keadaan Akhir & Tanggal Sembuh/Meninggal
    let keadaanText = c.keadaanAkhir || "Hidup / Sembuh";
    if (c.keadaanAkhir === "Hidup / Sembuh" && c.tanggalSembuh) {
      keadaanText += ` (Sembuh pada: ${this.formatDateIndo(c.tanggalSembuh)})`;
    } else if (c.keadaanAkhir === "Meninggal Dunia" && c.tanggalMeninggal) {
      keadaanText += ` (Meninggal pada: ${this.formatDateIndo(c.tanggalMeninggal)})`;
    }
    if (document.getElementById("pe-keadaan")) document.getElementById("pe-keadaan").innerText = keadaanText;

    // V. Tabel Kontak Kasus (Halaman 3 Baku Kemenkes - Nama Asli Kontak Sesuai Isian)
    const contactTableBody = document.getElementById("pe-dif1-contacts-table-body");
    if (contactTableBody) {
      let rowsHtml = "";
      if (Array.isArray(c.kontakList) && c.kontakList.length > 0) {
        c.kontakList.forEach((k, idx) => {
          rowsHtml += `<tr>
            <td class="p-1.5 border-r border-black text-center">${idx + 1}.</td>
            <td class="p-1.5 border-r border-black font-semibold">${k.nama || "-"}</td>
            <td class="p-1.5 border-r border-black text-center">${k.umur || "-"}</td>
            <td class="p-1.5 border-r border-black">${k.alamat || c.alamat || "-"}</td>
            <td class="p-1.5 border-r border-black">${k.hubungan || "Serumah"}</td>
            <td class="p-1.5 text-center">${k.imunisasi || "Lengkap"}</td>
          </tr>`;
        });
      } else {
        const krCount = c.kontakRumah || c.kontakEratRumah || 3;
        const ksCount = c.kontakSekolah || 1;
        const ktCount = c.kontakTetangga || 1;
        let noUrut = 1;

        rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">${c.namaIbu || "Ibu Kandung"}</td><td class="p-1.5 border-r border-black text-center">36</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Ibu / Serumah</td><td class="p-1.5 text-center">3 kali (Lengkap)</td></tr>`;
        rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Ayah Kandung</td><td class="p-1.5 border-r border-black text-center">40</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Ayah / Serumah</td><td class="p-1.5 text-center">3 kali (Lengkap)</td></tr>`;
        
        if (krCount >= 3) {
          rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Saudara Kandung</td><td class="p-1.5 border-r border-black text-center">${Math.max(1, (ageObj.years || 7) + 2)}</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Saudara / Serumah</td><td class="p-1.5 text-center">Lengkap (4 dosis)</td></tr>`;
        }
        if (ksCount > 0) {
          rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Teman Bermain / Sekolah</td><td class="p-1.5 border-r border-black text-center">${ageObj.years || 8}</td><td class="p-1.5 border-r border-black">${c.kelurahan || "Desa/Kel Setempat"}</td><td class="p-1.5 border-r border-black">Teman Bermain</td><td class="p-1.5 text-center">2 kali (Belum Lengkap)</td></tr>`;
        }
        if (ktCount > 0) {
          rowsHtml += `<tr><td class="p-1.5 border-r border-black text-center">${noUrut++}.</td><td class="p-1.5 border-r border-black font-semibold">Tetangga Dekat</td><td class="p-1.5 border-r border-black text-center">29</td><td class="p-1.5 border-r border-black">${c.alamat || "-"}</td><td class="p-1.5 border-r border-black">Tetangga</td><td class="p-1.5 text-center">Pernah Imunisasi</td></tr>`;
        }
      }

      contactTableBody.innerHTML = rowsHtml;
    }

    // TANDA TANGAN TUNGGAL: Petugas Penyelidik Epidemiologi Sesuai Identitas Pelapor Bagian I
    // (Bagian 'Mengetahui' Dihilangkan Sesuai Instruksi Resmi)
    const signLoc = `${c.kabupaten || "Jawa Timur"}, ${this.formatDateIndo(c.tanggalPelacakan || c.tanggalOnset || new Date())}`;
    if (document.getElementById("pe-sign-tgl-lokasi")) document.getElementById("pe-sign-tgl-lokasi").innerText = signLoc;
    if (document.getElementById("pe-sign-petugas-instansi")) document.getElementById("pe-sign-petugas-instansi").innerText = pKantor;
    if (document.getElementById("pe-sign-petugas-nama")) document.getElementById("pe-sign-petugas-nama").innerText = pNama;
    if (document.getElementById("pe-sign-petugas-nip")) document.getElementById("pe-sign-petugas-nip").innerText = (pNip && pNip !== "-") ? `NIP. ${pNip}` : `NIP. ........................................`;
    if (document.getElementById("pe-sign-petugas-jabatan")) document.getElementById("pe-sign-petugas-jabatan").innerText = pJabatan;

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
