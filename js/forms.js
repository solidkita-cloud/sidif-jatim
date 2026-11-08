/**
 * SIDIF JAWA TIMUR - FORM LOGIC, AUTOMATED CALCULATIONS & ANTI-DOBEL
 * Mengatur hitung umur otomatis, kalkulasi dosis, minggu epidemiologi,
 * ketepatan waktu pelacakan (PE) & spesimen, penentuan klasifikasi, dan algoritma kemiripan nama Jaro-Winkler.
 */

window.SIDIF_FORMS = {
  // 1. Hitung Umur Otomatis (Tahun & Bulan) dari Tanggal Lahir & Onset Sakit
  calculateAge(birthDateStr, onsetDateStr) {
    if (!birthDateStr) return { text: "-", years: 0, months: 0 };
    
    const birthDate = new Date(birthDateStr);
    const refDate = onsetDateStr ? new Date(onsetDateStr) : new Date();

    if (birthDate > refDate) {
      return { text: "Tanggal tidak valid (Lahir > Onset)", years: 0, months: 0, error: true };
    }

    let years = refDate.getFullYear() - birthDate.getFullYear();
    let months = refDate.getMonth() - birthDate.getMonth();
    let days = refDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      years: Math.max(0, years),
      months: Math.max(0, months),
      text: `${years} Tahun, ${months} Bulan`
    };
  },

  // 2. Hitung Total Dosis Vaksin Difteri (DPT + DT + Td)
  calculateDoses(dptVal, dtVal, tdVal) {
    let dptCount = 0;
    if (dptVal === "1") dptCount = 1;
    else if (dptVal === "2") dptCount = 2;
    else if (dptVal === "3") dptCount = 3;
    else if (dptVal === "4") dptCount = 4;

    let dtCount = (dtVal === "1" || dtVal === "Pernah (1 dosis)") ? 1 : 0;
    let tdCount = 0;
    if (tdVal === "1" || tdVal === "1 dosis") tdCount = 1;
    else if (tdVal === "2" || tdVal === "2 dosis") tdCount = 2;

    const total = dptCount + dtCount + tdCount;
    let label = "0 Dosis (Belum Pernah)";
    let statusImunisasi = "Tidak diimunisasi";

    if (total === 0) {
      label = "0 Dosis (Belum Pernah)";
      statusImunisasi = "Tidak diimunisasi";
    } else if (total >= 1 && total <= 2) {
      label = `${total} Dosis (Belum Lengkap)`;
      statusImunisasi = "Imunisasi belum lengkap";
    } else if (total === 3) {
      label = "3 Dosis (Belum Lengkap)";
      statusImunisasi = "Imunisasi belum lengkap";
    } else if (total >= 4) {
      label = `Lengkap (${total} Dosis)`;
      statusImunisasi = "Imunisasi lengkap";
    }

    if (dptVal === "Tidak Tahu") {
      label = "Tidak Tahu";
      statusImunisasi = "Tidak Tahu";
    }

    return { total, label, statusImunisasi };
  },

  // 3. Hitung Minggu Epidemiologi (Week M1 - M52) dari Tanggal Onset
  calculateWeek(onsetDateStr) {
    if (!onsetDateStr) return 1;
    const d = new Date(onsetDateStr);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
    return Math.min(52, Math.max(1, Math.ceil((dayOfYear + 1) / 7)));
  },

  // 4. Hitung Ketepatan Pelacakan PE (< 24 Jam)
  calculateTimelinessPE(tglLaporanStr, tglPEStr) {
    if (!tglLaporanStr || !tglPEStr) return "< 24 Jam";
    const d1 = new Date(tglLaporanStr);
    const d2 = new Date(tglPEStr);
    const diffHours = (d2 - d1) / (1000 * 60 * 60);
    return diffHours <= 24 ? "< 24 Jam" : "> 24 Jam";
  },

  // 5. Hitung Ketepatan Pengambilan Spesimen (< 48 Jam)
  calculateTimelinessSpecimen(tglPEStr, tglAmbilStr) {
    if (!tglPEStr || !tglAmbilStr) return "< 48 Jam";
    const d1 = new Date(tglPEStr);
    const d2 = new Date(tglAmbilStr);
    const diffHours = (d2 - d1) / (1000 * 60 * 60);
    return diffHours <= 48 ? "< 48 Jam" : "> 48 Jam";
  },

  // 6. Klasifikasi Otomatis Kasus Difteri Sesuai Juknis Kemenkes
  calculateClassification(data) {
    const kulturH = data.hasilKulturHidung || "";
    const kulturT = data.hasilKulturTenggorok || "";
    const kultur = data.hasilKultur || (kulturH === "Positif" || kulturT === "Positif" ? "Positif" : (kulturH === "Negatif" && kulturT === "Negatif" ? "Negatif" : "Pending"));
    const toksik = data.toksigenitas || "";
    const pseudo = !!data.pseudomembran;
    const demam = !!data.demam;
    const bullneck = !!data.bullneck;
    const kontak = !!data.hubunganEpidemiologi;

    // A. Konfirmasi Lab: Kultur Positif dan Toksigenik
    if (kultur === "Positif" && toksik === "Toksigenik") {
      return {
        kategori: "Konfirmasi Lab",
        labelBadge: "KLB Konfirmasi Lab",
        isKlb: true,
        penjelasan: "Ditemukan kuman C. diphtheriae toksigenik positif lewat uji kultur laboratorium BBLKM."
      };
    }

    // B. Kompatibel Klinis: Ada Pseudomembran DAN (Demam / Bullneck / Stridor), kultur negatif / pending
    if (pseudo && (demam || bullneck)) {
      if (kultur !== "Negatif") {
        return {
          kategori: "Kompatibel Klinis",
          labelBadge: "Sinyal KLB (Kompatibel Klinis)",
          isKlb: false,
          penjelasan: "Memenuhi gejala klinis difteri (pseudomembran & demam/bullneck). Menunggu hasil lab definitif."
        };
      }
    }

    // C. Hubungan Epidemiologi
    if ((demam || pseudo) && kontak) {
      return {
        kategori: "Hubungan Epidemiologi",
        labelBadge: "Hubungan Epidemiologi",
        isKlb: false,
        penjelasan: "Gejala klinis dengan riwayat kontak erat kasus difteri positif."
      };
    }

    // D. Discarded (Bukan Difteri)
    if (kultur === "Negatif" && !pseudo) {
      return {
        kategori: "Discarded",
        labelBadge: "Bukan Difteri (Discarded)",
        isKlb: false,
        penjelasan: "Hasil kultur laboratorium negatif dan kriteria klinis tidak terpenuhi."
      };
    }

    return {
      kategori: "Suspek",
      labelBadge: "Suspek Difteri",
      isKlb: false,
      penjelasan: "Kasus suspek difteri dalam penyelidikan awal."
    };
  },

  // 7. Normalisasi Nama Indonesia (Hapus Singkatan & Samakan Variasi)
  normalizeName(str) {
    if (!str) return "";
    let s = str.toLowerCase().trim();
    s = s.replace(/\bm[\.\s]+/g, "muhammad ");
    s = s.replace(/\bmoh[\.\s]+/g, "muhammad ");
    s = s.replace(/\bmuh[\.\s]+/g, "muhammad ");
    s = s.replace(/\bmd[\.\s]+/g, "muhammad ");
    s = s.replace(/\bsitti\b/g, "siti");
    s = s.replace(/\bputera\b/g, "putra");
    s = s.replace(/\bputeri\b/g, "putri");
    s = s.replace(/[^a-z0-9\s]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  },

  // 8. Algoritma Jaro-Winkler Similarity (Skor 0.0 - 1.0)
  jaroWinkler(s1, s2) {
    s1 = this.normalizeName(s1);
    s2 = this.normalizeName(s2);
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (!s2Matches[j] && s1[i] === s2[j]) {
          s1Matches[i] = true;
          s2Matches[j] = true;
          matches++;
          break;
        }
      }
    }

    if (matches === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1Matches[i]) {
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
      }
    }

    const jaro = ((matches / s1.length) + (matches / s2.length) + ((matches - transpositions / 2) / matches)) / 3;

    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + (prefix * 0.1 * (1 - jaro));
  },

  // 9. Pemeriksaan Anti-Dobel Pintar (NIK + Kemiripan Nama/Ibu/Tanggal)
  checkDuplicates(formData) {
    const cases = window.SIDIF_STORE.getCases();
    const currId = formData.id;

    if (formData.nik && formData.nik.length === 16 && !formData.hasNoNik) {
      const exactNik = cases.find(c => c.nik === formData.nik && c.id !== currId);
      if (exactNik) {
        return {
          isDuplicate: true,
          type: "HARD_BLOCK",
          matchedCase: exactNik,
          message: `NIK ${formData.nik} sudah terdaftar oleh ${exactNik.kabupaten} pada ${exactNik.createdAt.substring(0, 10)}. Nomor Epid: ${exactNik.noEpid}.`
        };
      }
    }

    let highestScore = 0;
    let matchedCandidate = null;

    for (const c of cases) {
      if (c.id === currId) continue;
      
      const simNama = this.jaroWinkler(formData.nama, c.nama);
      const simIbu = this.jaroWinkler(formData.namaIbu, c.namaIbu);
      const sameBirth = (formData.tanggalLahir && c.tanggalLahir && formData.tanggalLahir === c.tanggalLahir) ? 1.0 : 0.0;

      const totalScore = (simNama * 0.4) + (simIbu * 0.4) + (sameBirth * 0.2);

      if (totalScore > highestScore) {
        highestScore = totalScore;
        matchedCandidate = c;
      }
    }

    if (highestScore >= 0.8 && matchedCandidate) {
      return {
        isDuplicate: true,
        type: "SOFT_WARNING",
        scorePercent: Math.round(highestScore * 100),
        matchedCase: matchedCandidate,
        message: `Ditemukan data kemiripan ${Math.round(highestScore * 100)}% dengan pasien di ${matchedCandidate.kabupaten} (Ibu: ${matchedCandidate.namaIbu}, Lahir: ${matchedCandidate.tanggalLahir}).`
      };
    }

    return { isDuplicate: false };
  }
};
