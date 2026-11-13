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

  // 6. Klasifikasi Kasus Difteri Sesuai Pedoman Resmi Surveilans Dinkes:
  // 1. Hasil lab positif masuk kategori: Difteri Konfirmasi Lab
  // 2. Hasil lab negatif masuk kategori: Kompatibel Klinis
  // 3. Belum ada hasil lab tp ada spesimen yg diperiksa: Pending
  // 4. Tidak ada hasil lab dan tidak periksa lab: Kompatibel Klinis
  calculateClassification(data) {
    const kulturH = data.hasilKulturHidung || "";
    const kulturT = data.hasilKulturTenggorok || "";
    const tglH = data.tanggalAmbilHidung || "";
    const tglT = data.tanggalAmbilTenggorok || "";
    const hasilK = data.hasilKultur || "";
    
    // Cek apakah ada spesimen yang pernah diambil / dalam proses
    const hasSpecimen = (tglH && tglH !== "-") || (tglT && tglT !== "-") || kulturH === "Pending" || kulturT === "Pending" || hasilK === "Pending";

    // 1. Hasil lab positif -> Difteri Konfirmasi Lab
    if (kulturH === "Positif" || kulturT === "Positif" || hasilK === "Positif") {
      return {
        kategori: "Difteri Konfirmasi Lab",
        labelBadge: "Difteri Konfirmasi Lab",
        isKlb: true,
        badgeClass: "bg-red-100 text-red-800 border-red-300",
        penjelasan: "Ditemukan kuman C. diphtheriae positif lewat uji kultur laboratorium BBLKM."
      };
    }

    // 2. Hasil lab negatif -> Kompatibel Klinis
    if ((kulturH === "Negatif" || kulturT === "Negatif" || hasilK === "Negatif") && kulturH !== "Positif" && kulturT !== "Positif") {
      return {
        kategori: "Kompatibel Klinis",
        labelBadge: "Kompatibel Klinis",
        isKlb: false,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
        penjelasan: "Hasil kultur lab negatif, klasifikasi ditegakkan berdasarkan pemenuhan kriteria klinis difteri."
      };
    }

    // 3. Belum ada hasil lab tapi ada spesimen yang diperiksa -> Pending
    if (kulturH === "Pending" || kulturT === "Pending" || hasilK === "Pending" || hasSpecimen) {
      return {
        kategori: "Pending",
        labelBadge: "Pending (Menunggu Hasil Lab)",
        isKlb: false,
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
        penjelasan: "Spesimen usap telah diambil dan sedang dalam proses pemeriksaan kultur di laboratorium BBLKM."
      };
    }

    // 4. Tidak ada hasil lab dan tidak periksa lab -> Kompatibel Klinis
    return {
      kategori: "Kompatibel Klinis",
      labelBadge: "Kompatibel Klinis",
      isKlb: false,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      penjelasan: "Tidak dilakukan pemeriksaan lab / spesimen tidak diambil, klasifikasi ditegakkan berdasarkan gejala klinis."
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
  },

  // 10. Generator & Parser Nomor EPID Baku Kemenkes RI (9 Digit: D - [Prov] [Kab/Kota] [Tahun] [No Urut])
  // Berdasarkan Standar Permendagri & Petunjuk Teknis Surveilans Difteri Kemenkes RI
  KODE_WILAYAH_JATIM: {
    "kabupaten pacitan": { code: "3501", prov: "35", kab: "01", name: "Kabupaten Pacitan", type: "kabupaten" },
    "kabupaten ponorogo": { code: "3502", prov: "35", kab: "02", name: "Kabupaten Ponorogo", type: "kabupaten" },
    "kabupaten trenggalek": { code: "3503", prov: "35", kab: "03", name: "Kabupaten Trenggalek", type: "kabupaten" },
    "kabupaten tulungagung": { code: "3504", prov: "35", kab: "04", name: "Kabupaten Tulungagung", type: "kabupaten" },
    "kabupaten blitar": { code: "3505", prov: "35", kab: "05", name: "Kabupaten Blitar", type: "kabupaten" },
    "kabupaten kediri": { code: "3506", prov: "35", kab: "06", name: "Kabupaten Kediri", type: "kabupaten" },
    "kabupaten malang": { code: "3507", prov: "35", kab: "07", name: "Kabupaten Malang", type: "kabupaten" },
    "kabupaten lumajang": { code: "3508", prov: "35", kab: "08", name: "Kabupaten Lumajang", type: "kabupaten" },
    "kabupaten jember": { code: "3509", prov: "35", kab: "09", name: "Kabupaten Jember", type: "kabupaten" },
    "kabupaten banyuwangi": { code: "3510", prov: "35", kab: "10", name: "Kabupaten Banyuwangi", type: "kabupaten" },
    "kabupaten bondowoso": { code: "3511", prov: "35", kab: "11", name: "Kabupaten Bondowoso", type: "kabupaten" },
    "kabupaten situbondo": { code: "3512", prov: "35", kab: "12", name: "Kabupaten Situbondo", type: "kabupaten" },
    "kabupaten probolinggo": { code: "3513", prov: "35", kab: "13", name: "Kabupaten Probolinggo", type: "kabupaten" },
    "kabupaten pasuruan": { code: "3514", prov: "35", kab: "14", name: "Kabupaten Pasuruan", type: "kabupaten" },
    "kabupaten sidoarjo": { code: "3515", prov: "35", kab: "15", name: "Kabupaten Sidoarjo", type: "kabupaten" },
    "kabupaten mojokerto": { code: "3516", prov: "35", kab: "16", name: "Kabupaten Mojokerto", type: "kabupaten" },
    "kabupaten jombang": { code: "3517", prov: "35", kab: "17", name: "Kabupaten Jombang", type: "kabupaten" },
    "kabupaten nganjuk": { code: "3518", prov: "35", kab: "18", name: "Kabupaten Nganjuk", type: "kabupaten" },
    "kabupaten madiun": { code: "3519", prov: "35", kab: "19", name: "Kabupaten Madiun", type: "kabupaten" },
    "kabupaten magetan": { code: "3520", prov: "35", kab: "20", name: "Kabupaten Magetan", type: "kabupaten" },
    "kabupaten ngawi": { code: "3521", prov: "35", kab: "21", name: "Kabupaten Ngawi", type: "kabupaten" },
    "kabupaten bojonegoro": { code: "3522", prov: "35", kab: "22", name: "Kabupaten Bojonegoro", type: "kabupaten" },
    "kabupaten tuban": { code: "3523", prov: "35", kab: "23", name: "Kabupaten Tuban", type: "kabupaten" },
    "kabupaten lamongan": { code: "3524", prov: "35", kab: "24", name: "Kabupaten Lamongan", type: "kabupaten" },
    "kabupaten gresik": { code: "3525", prov: "35", kab: "25", name: "Kabupaten Gresik", type: "kabupaten" },
    "kabupaten bangkalan": { code: "3526", prov: "35", kab: "26", name: "Kabupaten Bangkalan", type: "kabupaten" },
    "kabupaten sampang": { code: "3527", prov: "35", kab: "27", name: "Kabupaten Sampang", type: "kabupaten" },
    "kabupaten pamekasan": { code: "3528", prov: "35", kab: "28", name: "Kabupaten Pamekasan", type: "kabupaten" },
    "kabupaten sumenep": { code: "3529", prov: "35", kab: "29", name: "Kabupaten Sumenep", type: "kabupaten" },
    "kota kediri": { code: "3571", prov: "35", kab: "71", name: "Kota Kediri", type: "kota" },
    "kota blitar": { code: "3572", prov: "35", kab: "72", name: "Kota Blitar", type: "kota" },
    "kota malang": { code: "3573", prov: "35", kab: "73", name: "Kota Malang", type: "kota" },
    "kota probolinggo": { code: "3574", prov: "35", kab: "74", name: "Kota Probolinggo", type: "kota" },
    "kota pasuruan": { code: "3575", prov: "35", kab: "75", name: "Kota Pasuruan", type: "kota" },
    "kota mojokerto": { code: "3576", prov: "35", kab: "76", name: "Kota Mojokerto", type: "kota" },
    "kota madiun": { code: "3577", prov: "35", kab: "77", name: "Kota Madiun", type: "kota" },
    "kota surabaya": { code: "3578", prov: "35", kab: "78", name: "Kota Surabaya", type: "kota" },
    "kota batu": { code: "3579", prov: "35", kab: "79", name: "Kota Batu", type: "kota" }
  },

  // Helper Pencari Metadata Wilayah (Menerima variasi nama kabupaten/kota, singkatan, dll)
  getRegionMetadata(regionName) {
    if (!regionName) return { code: "3500", prov: "35", kab: "00", name: "Jawa Timur", type: "provinsi" };
    let raw = String(regionName).toLowerCase().trim().replace(/^kab\.\s*/i, "kabupaten ");
    
    // Pemetaan langsung
    if (this.KODE_WILAYAH_JATIM[raw]) return this.KODE_WILAYAH_JATIM[raw];

    // Singkatan umum akun SIDIF
    const aliasMap = {
      "sda": "kabupaten sidoarjo", "sidoarjo": "kabupaten sidoarjo",
      "sby": "kota surabaya", "surabaya": "kota surabaya", "sur": "kota surabaya",
      "gre": "kabupaten gresik", "gresik": "kabupaten gresik",
      "tub": "kabupaten tuban", "tuban": "kabupaten tuban",
      "bkl": "kabupaten bangkalan", "bangkalan": "kabupaten bangkalan",
      "spg": "kabupaten sampang", "sampang": "kabupaten sampang",
      "pmk": "kabupaten pamekasan", "pamekasan": "kabupaten pamekasan",
      "smp": "kabupaten sumenep", "sumenep": "kabupaten sumenep",
      "jbg": "kabupaten jombang", "jombang": "kabupaten jombang",
      "bwi": "kabupaten banyuwangi", "banyuwangi": "kabupaten banyuwangi",
      "jbr": "kabupaten jember", "jember": "kabupaten jember",
      "lmj": "kabupaten lumajang", "lumajang": "kabupaten lumajang",
      "bjn": "kabupaten bojonegoro", "bojonegoro": "kabupaten bojonegoro",
      "lmg": "kabupaten lamongan", "lamongan": "kabupaten lamongan",
      "ngw": "kabupaten ngawi", "ngawi": "kabupaten ngawi",
      "mgt": "kabupaten magetan", "magetan": "kabupaten magetan",
      "ngj": "kabupaten nganjuk", "nganjuk": "kabupaten nganjuk",
      "bdw": "kabupaten bondowoso", "bondowoso": "kabupaten bondowoso",
      "sit": "kabupaten situbondo", "situbondo": "kabupaten situbondo",
      "pct": "kabupaten pacitan", "pacitan": "kabupaten pacitan",
      "po": "kabupaten ponorogo", "ponorogo": "kabupaten ponorogo",
      "trg": "kabupaten trenggalek", "trenggalek": "kabupaten trenggalek",
      "ta": "kabupaten tulungagung", "tulungagung": "kabupaten tulungagung",
      "btu": "kota batu", "batu": "kota batu"
    };

    if (aliasMap[raw] && this.KODE_WILAYAH_JATIM[aliasMap[raw]]) {
      return this.KODE_WILAYAH_JATIM[aliasMap[raw]];
    }

    // Pemindaian parsial dengan perlindungan kab vs kota
    const entries = Object.entries(this.KODE_WILAYAH_JATIM);
    for (const [key, val] of entries) {
      const bareName = key.replace("kabupaten ", "").replace("kota ", "");
      if (raw.includes(bareName)) {
        if (raw.includes("kota") && val.type !== "kota") continue;
        if ((raw.includes("kab") || raw.includes("kabupaten")) && val.type !== "kabupaten") continue;
        return val;
      }
    }

    return { code: "3500", prov: "35", kab: "00", name: regionName, type: "kabupaten" };
  },

  // Generator Nomor EPID Baku Kemenkes (9 Digit: D-[Prov:2][Kab:2][Tahun:2][Urut:3])
  generateNoEpid(kabupatenName, customSeq = null, year = null, format = "standard") {
    const yrFull = year || new Date().getFullYear();
    const yr2 = String(yrFull).slice(-2);
    const meta = this.getRegionMetadata(kabupatenName);
    const provCode = meta.prov || "35";
    const kabCode = meta.kab || "00";

    // Hitung nomor urut kasus di wilayah ini pada tahun berjalan
    let seq = customSeq;
    if (!seq) {
      const allCases = window.SIDIF_STORE ? window.SIDIF_STORE.getCases() : [];
      const regionalCases = allCases.filter(c => {
        const cMeta = this.getRegionMetadata(c.kabupaten);
        const isSame = cMeta.code === meta.code;
        const cYear = (c.tanggalOnset ? new Date(c.tanggalOnset).getFullYear() : (c.createdAt ? new Date(c.createdAt).getFullYear() : yrFull));
        return isSame && cYear === yrFull;
      });
      seq = regionalCases.length + 1;
    }

    const padSeq = String(seq).padStart(3, "0");
    const rawCode = `D-${provCode}${kabCode}${yr2}${padSeq}`; // D-351526001 (9 Digit Baku Kemenkes)
    const segmentedCode = `D-${provCode}.${kabCode}-${yrFull}-${padSeq}`; // D-35.15-2026-001 (Format Readable)

    if (format === "boxes") {
      return {
        prefix: "D",
        prov: provCode,
        kab: kabCode,
        year: yr2,
        seq: padSeq,
        fullKemendagri: `${provCode}${kabCode}`,
        raw: rawCode,
        segmented: segmentedCode,
        digits: [provCode[0], provCode[1], kabCode[0], kabCode[1], yr2[0], yr2[1], padSeq[0], padSeq[1], padSeq[2]]
      };
    }

    if (format === "segmented") {
      return segmentedCode;
    }

    return rawCode;
  },

  // Parse string No. EPID apapun menjadi 9 digit array untuk kotak Form DIF-1
  parseEpidDigits(noEpidStr) {
    if (!noEpidStr) return ["3", "5", "0", "0", "2", "6", "0", "0", "1"];
    const cleanDigits = noEpidStr.replace(/^D[-.]?/i, "").replace(/[^0-9]/g, "");
    if (cleanDigits.length === 11) {
      // Format 11 digit: 35 15 2026 001
      const p = cleanDigits.slice(0, 2);
      const k = cleanDigits.slice(2, 4);
      const y = cleanDigits.slice(6, 8); // ambil 26 dari 2026
      const s = cleanDigits.slice(8, 11);
      return [p[0], p[1], k[0], k[1], y[0], y[1], s[0], s[1], s[2]];
    }
    if (cleanDigits.length >= 9) {
      return cleanDigits.slice(0, 9).split("");
    }
    return (cleanDigits.padEnd(9, "0")).split("");
  }
};