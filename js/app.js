/**
 * SIDIF JAWA TIMUR - MAIN APPLICATION CONTROLLER
 * Menghubungkan seluruh modul: Welcome Screen, Peta 2D, Dashboard Surveilans M1-M43,
 * Dropdown Pemilihan 38 Wilayah, Form DIF-3 (53 Kolom), Anti-Dobel, dan Notifikasi Real-time.
 */

window.SIDIF_APP = {
  activeView: "welcome",
  currentSortCol: "tanggalOnset",
  currentSortAsc: false,
  currentPage: 1,
  pageSize: 25,
  pendingFormData: null,

  init() {
    this.applySettings();
    this.loadNotifications();
    this.renderNotifications();
    this.initPresenceAndChat();

    this.setupEventListeners();
    this.renderTableData();
    if (window.SIDIF_CLOUD) {
      window.SIDIF_CLOUD.init();
    }

    window.addEventListener("DOMContentLoaded", () => {
      const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
      if (user) {
        this.updateAuthUi(user);
      }
    });
  },

  // Terapkan Pengaturan Identitas Situs
  applySettings() {
    const settings = window.SIDIF_STORE.getSettings();
    const siteName = settings.appName || "SIDIF";
    const subTitle = settings.welcomeText || "Sistem Data Imunisasi & Surveilans Difteri Jawa Timur";
    document.querySelectorAll(".site-name-display").forEach(el => el.innerText = siteName);
    document.querySelectorAll(".site-subtitle-display").forEach(el => el.innerText = subTitle);
    document.title = `${siteName} — Dinas Kesehatan Provinsi Jawa Timur`;
  },

  // Navigasi Tampilan Antarmuka
  showView(viewName) {
    this.activeView = viewName;
    document.querySelectorAll(".app-view").forEach(el => el.classList.add("hidden"));

    const target = document.getElementById("view-" + viewName);
    if (target) {
      target.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (viewName === "dashboard") {
      setTimeout(() => {
        if (!window.SIDIF_MAP.mapInstance) {
          window.SIDIF_MAP.init("map-container");
        } else {
          window.SIDIF_MAP.mapInstance.invalidateSize();
        }
        this.applyDashboardFilters();
      }, 100);
    }

    if (viewName === "form-input") {
      this.setupFormForUser();
    }

    if (viewName === "table-data") {
      this.renderTableData();
    }

    if (viewName === "admin") {
      this.renderAdminLogs();
    }
  },

  // Atur Tampilan Login Header
  updateAuthUi(user) {
    const loginBtn = document.getElementById("header-login-btn");
    const userBadge = document.getElementById("header-user-badge");
    const navWorklist = document.getElementById("nav-worklist");
    const navAdmin = document.getElementById("nav-admin");

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (userBadge) {
        userBadge.classList.remove("hidden");
        document.getElementById("user-display-name").innerText = `${user.username} (${user.region})`;
        this.updateMyPresence("Online di Sistem");
      }
      if (navWorklist) navWorklist.classList.remove("hidden");
      if (navAdmin && (user.role === "superadmin" || user.role === "admin")) {
        navAdmin.classList.remove("hidden");
      }
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (userBadge) userBadge.classList.add("hidden");
      if (navWorklist) navWorklist.classList.add("hidden");
      if (navAdmin) navAdmin.classList.add("hidden");
    }

    // Segarkan data dan notifikasi sesuai hak akses akun
    this.renderNotifications();
    this.renderTableData();
    if (this.activeView === "dashboard") {
      this.applyDashboardFilters();
    }
  },

  // Setup Form Input Sesuai Hak Akses (Tenant Isolation)
  setupFormForUser() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user) {
      alert("Harap masuk (login) terlebih dahulu menggunakan akun petugas untuk menginput Form DIF-3.");
      this.showView("dashboard");
      document.getElementById("login-bar").classList.remove("hidden");
      return;
    }

    const regInput = document.getElementById("form-kabupaten");

    // Kunci Kabupaten Otomatis Sesuai Akun (Anti-Nyebrang)
    if (user.region !== "Provinsi Jawa Timur") {
      regInput.value = user.region;
      regInput.setAttribute("readonly", "readonly");
      regInput.classList.add("bg-slate-100", "cursor-not-allowed");
    } else {
      regInput.removeAttribute("readonly");
      regInput.classList.remove("bg-slate-100", "cursor-not-allowed");
    }

    this.populateKecamatanDropdown(user.region);
    this.resetFormFields();
  },

  // Isi Dropdown Kecamatan dari Master Data districts.js
  populateKecamatanDropdown(regionName) {
    const kecSelect = document.getElementById("form-kecamatan");
    if (!kecSelect) return;

    kecSelect.innerHTML = '<option value="">-- Pilih Kecamatan di ' + regionName + ' --</option>';
    const listKec = window.JATIM_DISTRICTS[regionName] || [];

    listKec.forEach(kec => {
      const opt = document.createElement("option");
      opt.value = kec;
      opt.innerText = "Kecamatan " + kec;
      kecSelect.appendChild(opt);
    });
  },

  // Isi Dropdown Desa / Kelurahan Berdasarkan Kecamatan Terpilih
  populateKelurahanDropdown(kecamatanName) {
    const kelSelect = document.getElementById("form-kelurahan");
    if (!kelSelect) return;

    kelSelect.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
    if (!kecamatanName) return;

    const listDesa = window.getDesaListForKecamatan ? window.getDesaListForKecamatan(kecamatanName) : [];
    listDesa.forEach(desa => {
      const opt = document.createElement("option");
      opt.value = desa;
      opt.innerText = desa;
      kelSelect.appendChild(opt);
    });

    const optManual = document.createElement("option");
    optManual.value = "__MANUAL__";
    optManual.innerText = "+ Tulis Desa / Kelurahan Lainnya...";
    kelSelect.appendChild(optManual);
  },

  // Terapkan Filter Wilayah (Default Jawa Timur / Per Kab-Kota), Tahun & Bulan ke Dashboard
  applyDashboardFilters() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isKabupaten = user && (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");

    const regionSelectEl = document.getElementById("dashboard-region-select");
    const filterTahunEl = document.getElementById("filter-tahun");
    const filterBulanEl = document.getElementById("filter-bulan");

    if (regionSelectEl) {
      if (isKabupaten) {
        regionSelectEl.value = user.region;
        regionSelectEl.disabled = true;
        regionSelectEl.classList.add("bg-slate-100", "cursor-not-allowed");
        regionSelectEl.title = `Terkunci: Dashboard menampilkan wilayah wewenang Anda: ${user.region}`;
      } else {
        regionSelectEl.disabled = false;
        regionSelectEl.classList.remove("bg-slate-100", "cursor-not-allowed");
        regionSelectEl.title = "Pilih Wilayah Pantauan";
      }
    }

    const selectedRegion = isKabupaten ? user.region : (regionSelectEl ? regionSelectEl.value : "Jawa Timur");
    const selectedYear = filterTahunEl ? filterTahunEl.value : "2026";
    const selectedMonth = filterBulanEl ? filterBulanEl.value : "all";

    // Update Subtitle Wilayah Aktif
    const subtitleEl = document.getElementById("dashboard-subtitle-region");
    if (subtitleEl) {
      if (selectedRegion === "Jawa Timur" || selectedRegion === "all") {
        subtitleEl.innerHTML = 'Menampilkan data agregat: <strong class="text-[#0F7A4F]">Seluruh Jawa Timur (Provinsi - Default)</strong>. Pilih kota/kabupaten di bawah untuk memfilter wilayah tertentu.';
      } else {
        subtitleEl.innerHTML = `Menampilkan data khusus wilayah: <strong class="text-[#DC2626]">${selectedRegion}</strong>. Untuk kembali ke seluruh provinsi, pilih "Seluruh Jawa Timur" pada menu wilayah.`;
      }
    }

    // Ambil kasus yang cocok
    const allCases = window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    const filteredCases = allCases.filter(c => {
      // Filter Wilayah
      const matchRegion = (!selectedRegion || selectedRegion === "all" || selectedRegion === "Jawa Timur" || selectedRegion === "Provinsi Jawa Timur") 
        ? true 
        : (c.kabupaten === selectedRegion || c.kabupaten === "Kabupaten " + selectedRegion || c.kabupaten === "Kota " + selectedRegion);
      
      // Filter Tahun
      if (!c.tanggalOnset) return false;
      const d = new Date(c.tanggalOnset);
      const matchYear = (!selectedYear || selectedYear === "all") ? true : d.getFullYear().toString() === selectedYear.toString();
      
      // Filter Bulan
      const matchMonth = (!selectedMonth || selectedMonth === "all") ? true : (d.getMonth() + 1).toString() === selectedMonth.toString();

      return matchRegion && matchYear && matchMonth;
    });

    // Kalkulasi Angka KPI Utama (Slide 4, 7, 8)
    const totalKasus = filteredCases.length;
    const konfirmasi = filteredCases.filter(c => c.klasifikasiKlinis === "Konfirmasi Lab").length;
    const klinis = filteredCases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis").length;
    const meninggal = filteredCases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) : "0.0";
    const adsCount = filteredCases.filter(c => c.adsDiberikan).length;
    const adsPct = totalKasus > 0 ? ((adsCount / totalKasus) * 100).toFixed(1) : "0.0";

    // Hitung Positivity Rate
    const pr = totalKasus > 0 ? ((konfirmasi / Math.max(konfirmasi + klinis, 1)) * 100).toFixed(1) : "0.0";

    // Hitung Kontak Serumah
    let kr = 0, profKr = 0;
    filteredCases.forEach(c => {
      kr += (c.kontakRumah || c.kontakEratRumah || 0);
      profKr += (c.profilaksisRumah || c.kontakEratProfilaksis || 0);
    });

    // Update Elemen KPI di DOM
    const kpiTotalEl = document.getElementById("kpi-total-kasus");
    const kpiSubEl = document.getElementById("kpi-sub-kasus");
    const kpiPrEl = document.getElementById("kpi-pr");
    const kpiSubPrEl = document.getElementById("kpi-sub-pr");
    const kpiCfrEl = document.getElementById("kpi-cfr");
    const kpiSubCfrEl = document.getElementById("kpi-sub-cfr");
    const kpiAdsEl = document.getElementById("kpi-ads");
    const kpiSubAdsEl = document.getElementById("kpi-sub-ads");
    const kpiKontakEl = document.getElementById("kpi-kontak");
    const kpiSubKontakEl = document.getElementById("kpi-sub-kontak");

    if (kpiTotalEl) kpiTotalEl.innerHTML = `${totalKasus} <span class="text-xs font-normal text-slate-500">Kasus</span>`;
    if (kpiSubEl) kpiSubEl.innerText = `Lab: ${konfirmasi} | Klinis: ${klinis}`;
    if (kpiPrEl) kpiPrEl.innerText = `${pr}%`;
    if (kpiSubPrEl) kpiSubPrEl.innerText = `${konfirmasi} Positif Kultur Lab`;
    if (kpiCfrEl) kpiCfrEl.innerText = `${cfr}%`;
    if (kpiSubCfrEl) kpiSubCfrEl.innerText = `${meninggal} Kasus Meninggal`;
    if (kpiAdsEl) kpiAdsEl.innerText = `${adsPct}%`;
    if (kpiSubAdsEl) kpiSubAdsEl.innerText = `${adsCount} Kasus Diberi ADS`;
    if (kpiKontakEl) kpiKontakEl.innerText = `${kr} Orang`;
    if (kpiSubKontakEl) kpiSubKontakEl.innerText = `${profKr} Diberi Profilaksis`;

    // Render Ulang Seluruh Grafik (Kurva M1-M43, Usia, Imunisasi, Gender, Kontak)
    if (window.SIDIF_CHARTS) {
      window.SIDIF_CHARTS.renderAllCharts(filteredCases);
    }

    // Update Peta 2D (Highlight & Zoom ke Wilayah)
    if (window.SIDIF_MAP && window.SIDIF_MAP.geoJsonLayer) {
      window.SIDIF_MAP.applyFilter(selectedYear, selectedMonth);
      window.SIDIF_MAP.focusRegion(selectedRegion);
    }
  },

  // Dipanggil saat pengguna mengklik wilayah poligon pada Peta 2D
  onRegionSelectedFromMap(displayName) {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isKabupaten = user && (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");
    if (isKabupaten) {
      this.applyDashboardFilters();
      return;
    }
    const regionSelectEl = document.getElementById("dashboard-region-select");
    if (regionSelectEl) {
      regionSelectEl.value = displayName;
      this.applyDashboardFilters();
    }
  },

  // Kontrol Kondisional Hasil Lab (Kultur Positif -> Wajib Varian & Toksigenitas; Negatif -> Terkunci)
  updateLabConditionalFields() {
    const kHidung = document.getElementById("form-hasil-kultur-hidung") ? document.getElementById("form-hasil-kultur-hidung").value : "";
    const kTenggorok = document.getElementById("form-hasil-kultur-tenggorok") ? document.getElementById("form-hasil-kultur-tenggorok").value : "";
    const isPositif = kHidung === "Positif" || kTenggorok === "Positif";

    const wrapVarian = document.getElementById("wrapper-form-varian");
    const wrapToksik = document.getElementById("wrapper-form-toksigenitas");
    const reqVarian = document.getElementById("req-varian");
    const reqToksik = document.getElementById("req-toksik");
    const selVarian = document.getElementById("form-varian");
    const selToksik = document.getElementById("form-toksigenitas");

    if (isPositif) {
      if (wrapVarian) wrapVarian.classList.remove("opacity-50", "pointer-events-none");
      if (wrapToksik) wrapToksik.classList.remove("opacity-50", "pointer-events-none");
      if (reqVarian) reqVarian.classList.remove("hidden");
      if (reqToksik) reqToksik.classList.remove("hidden");
      if (selVarian) selVarian.removeAttribute("disabled");
      if (selToksik) selToksik.removeAttribute("disabled");
    } else {
      if (wrapVarian) wrapVarian.classList.add("opacity-50", "pointer-events-none");
      if (wrapToksik) wrapToksik.classList.add("opacity-50", "pointer-events-none");
      if (reqVarian) reqVarian.classList.add("hidden");
      if (reqToksik) reqToksik.classList.add("hidden");
      if (selVarian) { selVarian.value = "-"; selVarian.setAttribute("disabled", "disabled"); }
      if (selToksik) { selToksik.value = "-"; selToksik.setAttribute("disabled", "disabled"); }
    }
    this.updateLiveCalculations();
  },

  // Kontrol Input Antibiotik (Azitromisin, Eritromisin, Manual, & Validasi Tanggal)
  handleAntibiotikChange() {
    const sel = document.getElementById("form-antibiotik");
    if (!sel) return;
    const val = sel.value;
    const boxManual = document.getElementById("box-antibiotik-manual");
    const reqTgl = document.getElementById("req-tgl-anti");
    const inputTgl = document.getElementById("form-tgl-antibiotik");

    if (val === "Lainnya") {
      if (boxManual) boxManual.classList.remove("hidden");
    } else {
      if (boxManual) boxManual.classList.add("hidden");
    }

    if (val !== "Tidak") {
      if (reqTgl) reqTgl.classList.remove("hidden");
    } else {
      if (reqTgl) reqTgl.classList.add("hidden");
      if (inputTgl) inputTgl.value = "";
    }
  },

  // Kontrol Input Terapi ADS (Dosis IU & Tanggal Wajib Jika ADS Diberikan)
  handleAdsChange() {
    const chk = document.getElementById("form-ads");
    if (!chk) return;
    const isChecked = chk.checked;
    const reqTgl = document.getElementById("req-tgl-ads");
    const reqDosis = document.getElementById("req-dosis-ads");
    const inputTgl = document.getElementById("form-tgl-ads");
    const inputDosis = document.getElementById("form-ads-dosis");

    if (isChecked) {
      if (reqTgl) reqTgl.classList.remove("hidden");
      if (reqDosis) reqDosis.classList.remove("hidden");
      if (inputDosis && (!inputDosis.value || inputDosis.value === "0")) inputDosis.value = "40000";
    } else {
      if (reqTgl) reqTgl.classList.add("hidden");
      if (reqDosis) reqDosis.classList.add("hidden");
      if (inputTgl) inputTgl.value = "";
      if (inputDosis) inputDosis.value = "";
    }
  },

  // Edit / Update Kasus & Hasil Lab BBLKM
  editCase(caseId) {
    const c = window.SIDIF_STORE.getCaseById(caseId);
    if (!c) {
      alert("Data kasus difteri tidak ditemukan.");
      return;
    }

    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isRegionalUser = currentUser && (currentUser.type === "kabupaten" || currentUser.type === "kota" || currentUser.role === "operator");
    if (isRegionalUser) {
      const normExact = (s) => (s || "").trim().toLowerCase().replace(/^kab\.\s*/i, "kabupaten ");
      if (normExact(currentUser.region) !== normExact(c.kabupaten)) {
        alert(`AKSES DITOLAK: Anda sedang masuk sebagai petugas ${currentUser.username} (${currentUser.region}).

Anda hanya berwenang mengubah kasus untuk wilayah Anda: ${currentUser.region}.`);
        return;
      }
    }

    this.showView("form-input");

    document.getElementById("form-case-id").value = c.id;
    if (document.getElementById("form-no-epid")) document.getElementById("form-no-epid").value = c.noEpid || "";
    if (document.getElementById("form-nik")) document.getElementById("form-nik").value = c.nik || "";
    if (document.getElementById("form-no-nik-chk")) {
      document.getElementById("form-no-nik-chk").checked = !!c.hasNoNik;
      document.getElementById("form-nik").disabled = !!c.hasNoNik;
    }
    if (document.getElementById("form-nama")) document.getElementById("form-nama").value = c.nama || "";
    if (document.getElementById("form-nama-ibu")) document.getElementById("form-nama-ibu").value = c.namaIbu || "";
    if (document.getElementById("form-tgl-lahir")) document.getElementById("form-tgl-lahir").value = c.tanggalLahir || "";
    if (document.getElementById("form-tgl-onset")) document.getElementById("form-tgl-onset").value = c.tanggalOnset || "";
    this.selectGender(c.jenisKelamin === "P" ? "P" : "L");
    if (document.getElementById("form-alamat")) document.getElementById("form-alamat").value = c.alamat || "";
    if (document.getElementById("form-kabupaten")) document.getElementById("form-kabupaten").value = c.kabupaten || "";
    this.populateKecamatanDropdown(c.kabupaten);
    if (document.getElementById("form-kecamatan")) document.getElementById("form-kecamatan").value = c.kecamatan || "";
    this.populateKelurahanDropdown(c.kecamatan);
    if (document.getElementById("form-kelurahan")) document.getElementById("form-kelurahan").value = c.kelurahan || "";

    // Gejala
    if (document.getElementById("form-demam")) document.getElementById("form-demam").checked = !!c.demam;
    if (document.getElementById("form-nyeri")) document.getElementById("form-nyeri").checked = !!c.nyeriMenelan;
    if (document.getElementById("form-bullneck")) document.getElementById("form-bullneck").checked = !!c.bullneck;
    if (document.getElementById("form-pseudo")) document.getElementById("form-pseudo").checked = !!c.pseudomembran;

    // Imunisasi
    if (document.getElementById("form-dpt")) document.getElementById("form-dpt").value = c.dpt || "0";
    if (document.getElementById("form-dt")) document.getElementById("form-dt").value = c.dt || "0";
    if (document.getElementById("form-td")) document.getElementById("form-td").value = c.td || "0";
    if (document.getElementById("form-tgl-terakhir-vax")) document.getElementById("form-tgl-terakhir-vax").value = c.tanggalTerakhirVaksinasi !== "-" ? (c.tanggalTerakhirVaksinasi || "") : "";
    if (document.getElementById("form-sumber-vax")) document.getElementById("form-sumber-vax").value = c.sumberImunisasi || "Buku KIA";

    // Lab
    if (document.getElementById("form-tgl-ambil-hidung")) document.getElementById("form-tgl-ambil-hidung").value = c.tanggalAmbilHidung !== "-" ? (c.tanggalAmbilHidung || "") : "";
    if (document.getElementById("form-tgl-ambil-tenggorok")) document.getElementById("form-tgl-ambil-tenggorok").value = c.tanggalAmbilTenggorok !== "-" ? (c.tanggalAmbilTenggorok || "") : "";
    if (document.getElementById("form-tgl-kirim-hidung")) document.getElementById("form-tgl-kirim-hidung").value = c.tanggalKirimHidung !== "-" ? (c.tanggalKirimHidung || "") : "";
    if (document.getElementById("form-tgl-kirim-tenggorok")) document.getElementById("form-tgl-kirim-tenggorok").value = c.tanggalKirimTenggorok !== "-" ? (c.tanggalKirimTenggorok || "") : "";

    if (document.getElementById("form-hasil-kultur-hidung")) document.getElementById("form-hasil-kultur-hidung").value = c.hasilKulturHidung || c.hasilKultur || "Pending";
    if (document.getElementById("form-hasil-kultur-tenggorok")) document.getElementById("form-hasil-kultur-tenggorok").value = c.hasilKulturTenggorok || c.hasilKultur || "Pending";
    if (document.getElementById("form-varian")) document.getElementById("form-varian").value = c.varian || "-";
    if (document.getElementById("form-toksigenitas")) document.getElementById("form-toksigenitas").value = c.toksigenitas || "-";

    // Pengobatan
    if (document.getElementById("form-antibiotik")) {
      const isKnown = ["Azitromisin", "Eritromisin", "Penisilin Prokain", "Amoksisilin", "Tidak"].includes(c.antibiotik);
      if (isKnown) {
        document.getElementById("form-antibiotik").value = c.antibiotik;
      } else if (c.antibiotik) {
        document.getElementById("form-antibiotik").value = "Lainnya";
        if (document.getElementById("form-antibiotik-manual")) {
          document.getElementById("form-antibiotik-manual").value = c.antibiotik;
          document.getElementById("box-antibiotik-manual").classList.remove("hidden");
        }
      }
    }
    if (document.getElementById("form-tgl-antibiotik")) document.getElementById("form-tgl-antibiotik").value = c.tanggalAntibiotik !== "-" ? (c.tanggalAntibiotik || "") : "";
    if (document.getElementById("form-keadaan")) document.getElementById("form-keadaan").value = c.keadaanAkhir || "Hidup / Sembuh";
    if (document.getElementById("form-ads")) document.getElementById("form-ads").checked = !!c.adsDiberikan;
    if (document.getElementById("form-tgl-ads")) document.getElementById("form-tgl-ads").value = c.tanggalADS !== "-" ? (c.tanggalADS || "") : "";
    if (document.getElementById("form-ads-dosis")) document.getElementById("form-ads-dosis").value = c.adsDosis || "";

    // Kontak
    if (document.getElementById("form-kontak-rumah")) document.getElementById("form-kontak-rumah").value = c.kontakRumah || c.kontakEratRumah || "";
    if (document.getElementById("form-prof-rumah")) document.getElementById("form-prof-rumah").value = c.profilaksisRumah || c.kontakEratProfilaksis || "";
    if (document.getElementById("form-kontak-sekolah")) document.getElementById("form-kontak-sekolah").value = c.kontakSekolah || "";
    if (document.getElementById("form-prof-sekolah")) document.getElementById("form-prof-sekolah").value = c.profilaksisSekolah || "";
    if (document.getElementById("form-kontak-tetangga")) document.getElementById("form-kontak-tetangga").value = c.kontakTetangga || "";
    if (document.getElementById("form-prof-tetangga")) document.getElementById("form-prof-tetangga").value = c.profilaksisTetangga || "";
    if (document.getElementById("form-kontak-bermain")) document.getElementById("form-kontak-bermain").value = c.kontakBermain || "";
    if (document.getElementById("form-prof-bermain")) document.getElementById("form-prof-bermain").value = c.profilaksisBermain || "";
    if (document.getElementById("form-keterangan")) document.getElementById("form-keterangan").value = c.keterangan || "";

    this.updateLabConditionalFields();
    this.handleAntibiotikChange();
    this.handleAdsChange();
    this.updateLiveCalculations();
  },

  // Reset Formulir dan Bersihkan Input (Tanpa Default 0)
  resetFormFields() {
    const form = document.getElementById("main-dif3-form");
    if (form) form.reset();

    document.getElementById("form-case-id").value = "";
    const userCurr = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (userCurr && userCurr.region !== "Provinsi Jawa Timur") {
      const regInput = document.getElementById("form-kabupaten");
      if (regInput) {
        regInput.value = userCurr.region;
        regInput.setAttribute("readonly", "readonly");
        regInput.classList.add("bg-slate-100", "cursor-not-allowed");
      }
      this.populateKecamatanDropdown(userCurr.region);
    }
    if (document.getElementById("form-no-epid")) {
      document.getElementById("form-no-epid").value = userCurr ? window.SIDIF_FORMS.generateNoEpid(userCurr.region) : "";
    }
    if (document.getElementById("form-antibiotik")) document.getElementById("form-antibiotik").value = "Azitromisin";
    this.handleAntibiotikChange();
    this.handleAdsChange();
    this.updateLabConditionalFields();
    document.getElementById("form-calc-umur").value = "-";
    document.getElementById("form-calc-dosis").value = "0 Dosis (Belum Pernah)";
    document.getElementById("form-calc-klasifikasi").value = "Suspek Difteri";
    document.getElementById("form-calc-minggu-epid").value = "M01";
    document.getElementById("form-calc-timeliness-pe").value = "< 24 Jam";
    
    this.selectGender("L");

    document.getElementById("form-ads-dosis").value = "";
    document.getElementById("form-kontak-rumah").value = "";
    document.getElementById("form-prof-rumah").value = "";
    document.getElementById("form-kontak-sekolah").value = "";
    document.getElementById("form-prof-sekolah").value = "";
    document.getElementById("form-kontak-tetangga").value = "";
    document.getElementById("form-prof-tetangga").value = "";
    document.getElementById("form-kontak-bermain").value = "";
    document.getElementById("form-prof-bermain").value = "";
    document.getElementById("form-keterangan").value = "";
  },

  // Pilihan Gender Visual (Biru Laki-laki vs Pink Perempuan)
  selectGender(genderCode) {
    const cardMale = document.getElementById("gender-card-male");
    const cardFemale = document.getElementById("gender-card-female");
    const radioMale = document.getElementById("gender-radio-male");
    const radioFemale = document.getElementById("gender-radio-female");

    if (genderCode === "L") {
      radioMale.checked = true;
      cardMale.classList.add("border-blue-600", "bg-blue-50/80");
      cardFemale.classList.remove("border-pink-400", "bg-pink-50");
      cardFemale.classList.add("border-slate-200", "bg-white");
    } else {
      radioFemale.checked = true;
      cardFemale.classList.add("border-pink-400", "bg-pink-50");
      cardMale.classList.remove("border-blue-600", "bg-blue-50/80");
      cardMale.classList.add("border-slate-200", "bg-white");
    }
  },

  // Update Kartu Rincian Wilayah di Sisi Kanan Peta
  updateRegionDetailCard(data, displayName) {
    const cardName = document.getElementById("card-region-name");
    const cardBadge = document.getElementById("card-region-badge");
    const cardStatus = document.getElementById("card-region-status");
    const cardKasus = document.getElementById("card-region-kasus");
    const cardVax = document.getElementById("card-region-vax");
    const cardPuskesmas = document.getElementById("card-region-puskesmas");
    const cardExpl = document.getElementById("card-region-explanation");

    if (!cardName) return;

    cardName.innerText = displayName;
    const cases = data.kasus || 0;
    cardKasus.innerText = `${cases} Kasus`;
    
    const vaxPct = data.targetBalita > 0 ? Math.round((data.dpt3 / data.targetBalita) * 100) : 0;
    cardVax.innerText = `${vaxPct}%`;
    cardPuskesmas.innerText = `${data.puskesmasLapor || 0} / ${data.puskesmasTotal || 0} Puskesmas`;

    if (cases === 0) {
      cardBadge.className = "px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded";
      cardBadge.innerText = "Bebas Kasus (Aman)";
      cardStatus.innerText = "Nol Kasus Aktif";
      cardStatus.className = "font-bold text-emerald-700";
      cardExpl.innerText = `Wilayah ${displayName} tidak melaporkan temuan kasus difteri aktif dalam 14 hari terakhir. Cakupan imunisasi balita dalam pengawasan rutin dinas.`;
    } else if (data.kasusKonfirmasi > 0) {
      cardBadge.className = "px-2.5 py-1 bg-red-100 text-red-800 font-bold text-xs rounded";
      cardBadge.innerText = "KLB Terkonfirmasi";
      cardStatus.innerText = "Ada Kasus Positif Kultur Lab BBLKM";
      cardStatus.className = "font-bold text-red-600";
      cardExpl.innerText = `Ditemukan ${data.kasusKonfirmasi} kasus konfirmasi positif kuman toksigenik. Penyelidikan epidemiologi dan pemberian profilaksis kontak serumah telah dituntaskan.`;
    } else {
      cardBadge.className = "px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded";
      cardBadge.innerText = "Sinyal Kompatibel Klinis";
      cardStatus.innerText = "Kasus Klinis dengan Pseudomembran";
      cardStatus.className = "font-bold text-amber-700";
      cardExpl.innerText = `Wilayah melaporkan ${cases} kasus dengan tanda klinis khas difteri. Spesimen usap telah dikirimkan ke laboratorium rujukan BBLKM Surabaya.`;
    }
  },

  // Filter Tabel Kasus Form DIF-3
  applyTableFilters() {
    this.currentPage = 1;
    this.renderTableData();
  },

  // Render Tabel Data Kasus Rekap DIF-3
  renderTableData() {
    const tbody = document.getElementById("table-cases-body");
    if (!tbody) return;

    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isKabupaten = user && (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");

    const filterRegionEl = document.getElementById("table-filter-region");
    const searchInputEl = document.getElementById("table-search-input");
    const pageSizeEl = document.getElementById("table-page-size");

    // Jika akun Kabupaten/Kota: Kunci dropdown filter tabel ke wilayahnya sendiri
    if (filterRegionEl) {
      if (isKabupaten) {
        filterRegionEl.value = user.region;
        filterRegionEl.disabled = true;
        filterRegionEl.classList.add("bg-slate-100", "cursor-not-allowed");
        filterRegionEl.title = `Terkunci: Anda hanya berwenang mengakses data rekap ${user.region}`;
      } else {
        filterRegionEl.disabled = false;
        filterRegionEl.classList.remove("bg-slate-100", "cursor-not-allowed");
        filterRegionEl.title = "Filter Wilayah Kasus";
      }
    }

    const selRegion = filterRegionEl ? filterRegionEl.value : "all";
    const query = searchInputEl ? searchInputEl.value.trim().toLowerCase() : "";
    const sizeVal = pageSizeEl ? pageSizeEl.value : "25";

    let cases = window.SIDIF_STORE.getCases();

    // ISOLASI WILAYAH KABUPATEN/KOTA PADA TABEL (ANTI-INTIP DAERAH LAIN)
    if (isKabupaten) {
      const normExact = (s) => (s || "").trim().toLowerCase().replace(/^kab\.\s*/i, "kabupaten ");
      const normUser = normExact(user.region);
      cases = cases.filter(c => normExact(c.kabupaten) === normUser);
    } else if (selRegion !== "all") {
      cases = cases.filter(c => c.kabupaten === selRegion || c.kabupaten === "Kabupaten " + selRegion || c.kabupaten === "Kota " + selRegion);
    }

    // Filter Pencarian Teks
    if (query) {
      cases = cases.filter(c => 
        (c.nama && c.nama.toLowerCase().includes(query)) ||
        (c.nik && c.nik.includes(query)) ||
        (c.noEpid && c.noEpid.toLowerCase().includes(query)) ||
        (c.kabupaten && c.kabupaten.toLowerCase().includes(query)) ||
        (c.kecamatan && c.kecamatan.toLowerCase().includes(query))
      );
    }

    // Sorting
    const col = this.currentSortCol;
    const asc = this.currentSortAsc;
    cases.sort((a, b) => {
      let vA = a[col] || "";
      let vB = b[col] || "";
      if (typeof vA === "string") vA = vA.toLowerCase();
      if (typeof vB === "string") vB = vB.toLowerCase();
      if (vA < vB) return asc ? -1 : 1;
      if (vA > vB) return asc ? 1 : -1;
      return 0;
    });

    // Paginasi
    const totalRecords = cases.length;
    const pageSize = sizeVal === "all" ? totalRecords : parseInt(sizeVal, 10);
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * pageSize;
    const pagedCases = cases.slice(startIdx, startIdx + pageSize);

    // Render Baris Tabel
    if (pagedCases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center text-slate-400 font-medium">Tidak ada data kasus yang cocok dengan kriteria filter.</td></tr>`;
    } else {
      tbody.innerHTML = pagedCases.map(c => {
        const isKonf = c.klasifikasiKlinis === "Konfirmasi Lab";
        const isDead = c.keadaanAkhir === "Meninggal Dunia";
        const badgeKlas = isKonf 
          ? `<span class="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded uppercase">Konfirmasi Lab</span>`
          : `<span class="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded uppercase">Klinis</span>`;

        const badgeKeadaan = isDead
          ? `<span class="text-red-600 font-bold">Meninggal</span>`
          : `<span class="text-emerald-700 font-medium">Hidup / Sembuh</span>`;

        const jkDisplay = c.jenisKelamin === "L" 
          ? `<span class="text-blue-600 font-bold">L</span>` 
          : `<span class="text-pink-600 font-bold">P</span>`;

        return `
          <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3 font-mono font-bold text-slate-800">${c.noEpid || "-"}</td>
            <td class="p-3">
              <span class="font-bold text-slate-900 block">${c.nama}</span>
              <span class="text-[10px] text-slate-400 font-mono">${c.hasNoNik ? "Belum Ada NIK" : (c.nik || "-")}</span>
            </td>
            <td class="p-3 text-slate-600">
              <span class="font-semibold block">${c.kabupaten}</span>
              <span class="text-[10px] text-slate-400">Kec. ${c.kecamatan || "-"}</span>
            </td>
            <td class="p-3 text-center">${jkDisplay}</td>
            <td class="p-3 font-medium">${c.umurTahun || 0} Th, ${c.umurBulan || 0} Bln</td>
            <td class="p-3 text-slate-600 font-mono text-[11px]">${c.tanggalOnset || "-"} <span class="block text-[10px] text-slate-400">Week M${c.mingguEpid || 1}</span></td>
            <td class="p-3">${badgeKlas}</td>
            <td class="p-3 font-mono font-semibold ${c.hasilKultur === 'Positif' ? 'text-red-700' : 'text-slate-500'}">${c.hasilKultur || "Pending"}</td>
            <td class="p-3">${badgeKeadaan}</td>
            <td class="p-3 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button type="button" onclick="window.SIDIF_APP.editCase('${c.id}')" class="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300 text-[11px] font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer" title="Edit dan perbarui hasil lab">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  <span>Edit / Update Lab</span>
                </button>
                <button type="button" onclick="window.SIDIF_EXPORT.viewFormPe('${c.id}')" class="px-2.5 py-1.5 bg-[#0F7A4F] hover:bg-[#15803D] text-white text-[11px] font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer" title="Cetak formulir baku DIF-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <span>Form DIF-1</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    // Paginasi Info
    const infoEl = document.getElementById("table-pagination-info");
    if (infoEl) {
      const endIdx = Math.min(startIdx + pageSize, totalRecords);
      infoEl.innerText = `Menampilkan ${totalRecords === 0 ? 0 : startIdx + 1} – ${endIdx} dari total ${totalRecords} data kasus`;
    }

    // Paginasi Controls
    const controlsEl = document.getElementById("table-pagination-controls");
    if (controlsEl) {
      controlsEl.innerHTML = `
        <button onclick="window.SIDIF_APP.changePage(${this.currentPage - 1})" ${this.currentPage <= 1 ? "disabled" : ""} class="px-3 py-1.5 border border-slate-300 rounded font-bold hover:bg-slate-100 disabled:opacity-40">◀</button>
        <span class="px-3 py-1.5 bg-[#0F7A4F] text-white rounded font-bold">${this.currentPage} / ${totalPages}</span>
        <button onclick="window.SIDIF_APP.changePage(${this.currentPage + 1})" ${this.currentPage >= totalPages ? "disabled" : ""} class="px-3 py-1.5 border border-slate-300 rounded font-bold hover:bg-slate-100 disabled:opacity-40">▶</button>
      `;
    }
  },

  changePage(newPage) {
    this.currentPage = newPage;
    this.renderTableData();
  },

  sortTable(col) {
    if (this.currentSortCol === col) {
      this.currentSortAsc = !this.currentSortAsc;
    } else {
      this.currentSortCol = col;
      this.currentSortAsc = true;
    }
    this.renderTableData();
  },

  // Simpan Formulir Kasus Difteri (Mencakup 53 Kolom)
  handleFormSubmit() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user) {
      alert("Harap login terlebih dahulu.");
      return;
    }

    const hasNoNik = document.getElementById("form-no-nik-chk").checked;
    let nikVal = document.getElementById("form-nik").value.trim();
    const namaVal = document.getElementById("form-nama").value.trim();
    const namaIbuVal = document.getElementById("form-nama-ibu").value.trim();
    const tglLahirVal = document.getElementById("form-tgl-lahir").value;
    const tglOnsetVal = document.getElementById("form-tgl-onset").value;
    const kecVal = document.getElementById("form-kecamatan").value;

    if (!hasNoNik && nikVal.length !== 16) {
      alert("Nomor Induk Kependudukan (NIK) wajib 16 digit angka. Jika bayi belum ada NIK, centang kotak 'Bayi Belum Memiliki NIK Resmi'.");
      document.getElementById("form-nik").focus();
      return;
    }
    if (!namaVal) {
      alert("Nama lengkap pasien wajib diisi.");
      document.getElementById("form-nama").focus();
      return;
    }
    if (!namaIbuVal) {
      alert("Nama ibu kandung wajib diisi untuk verifikasi anti-dobel.");
      document.getElementById("form-nama-ibu").focus();
      return;
    }
    if (!tglLahirVal) {
      alert("Tanggal lahir wajib diisi.");
      document.getElementById("form-tgl-lahir").focus();
      return;
    }
    if (!tglOnsetVal) {
      alert("Tanggal mulai sakit (onset) wajib diisi.");
      document.getElementById("form-tgl-onset").focus();
      return;
    }
    if (!kecVal) {
      alert("Kecamatan wajib dipilih.");
      document.getElementById("form-kecamatan").focus();
      return;
    }

    let kelVal = (document.getElementById("form-kelurahan") ? document.getElementById("form-kelurahan").value : "").trim();
    if (kelVal === "__MANUAL__") {
      kelVal = (document.getElementById("form-kelurahan-manual") ? document.getElementById("form-kelurahan-manual").value : "").trim();
    }
    if (!kelVal) {
      alert("Desa / Kelurahan wajib dipilih atau dituliskan.");
      return;
    }

    const genderVal = document.getElementById("gender-radio-male").checked ? "L" : "P";
    const dptVal = document.getElementById("form-dpt").value;
    const dtVal = document.getElementById("form-dt").value;
    const tdVal = document.getElementById("form-td").value;
    const dosesObj = window.SIDIF_FORMS.calculateDoses(dptVal, dtVal, tdVal);
    const ageObj = window.SIDIF_FORMS.calculateAge(tglLahirVal, tglOnsetVal);
    const weekVal = window.SIDIF_FORMS.calculateWeek(tglOnsetVal);

    const tglLaporanVal = document.getElementById("form-tgl-terima-laporan").value || tglOnsetVal;
    const tglPEVal = document.getElementById("form-tgl-pe").value || tglLaporanVal;
    const timelinessPE = window.SIDIF_FORMS.calculateTimelinessPE(tglLaporanVal, tglPEVal);

    const tglAmbilHidung = document.getElementById("form-tgl-ambil-hidung").value;
    const tglAmbilTenggorok = document.getElementById("form-tgl-ambil-tenggorok").value;
    const tglKirimHidung = document.getElementById("form-tgl-kirim-hidung").value;
    const tglKirimTenggorok = document.getElementById("form-tgl-kirim-tenggorok").value;
    const timelinessSpec = window.SIDIF_FORMS.calculateTimelinessSpecimen(tglPEVal, tglAmbilHidung || tglAmbilTenggorok);

    const hasilKulturH = document.getElementById("form-hasil-kultur-hidung").value;
    const hasilKulturT = document.getElementById("form-hasil-kultur-tenggorok").value;
    const hasilKulturOverall = (hasilKulturH === "Positif" || hasilKulturT === "Positif") ? "Positif" : ((hasilKulturH === "Negatif" && hasilKulturT === "Negatif") ? "Negatif" : "Pending");

    // Validasi No. EPID (Identitas Utama Baku Kemenkes)
    let noEpidVal = document.getElementById("form-no-epid") ? document.getElementById("form-no-epid").value.trim() : "";
    if (!noEpidVal) {
      noEpidVal = window.SIDIF_FORMS.generateNoEpid(user.region);
      if (document.getElementById("form-no-epid")) document.getElementById("form-no-epid").value = noEpidVal;
    }

    // Validasi Antibiotik & Tanggal Mulai
    let antibiotikVal = document.getElementById("form-antibiotik") ? document.getElementById("form-antibiotik").value : "Azitromisin";
    if (antibiotikVal === "Lainnya") {
      antibiotikVal = document.getElementById("form-antibiotik-manual") ? document.getElementById("form-antibiotik-manual").value.trim() : "Antibiotik Lainnya";
      if (!antibiotikVal) antibiotikVal = "Antibiotik Lainnya";
    }
    const tglAntibiotikVal = document.getElementById("form-tgl-antibiotik") ? document.getElementById("form-tgl-antibiotik").value : "";
    if (antibiotikVal !== "Tidak" && !tglAntibiotikVal) {
      alert("Tanggal mulai pemberian antibiotik wajib diisi.");
      document.getElementById("form-tgl-antibiotik").focus();
      return;
    }

    // Validasi ADS (Anti Diphtheria Serum)
    const adsVal = document.getElementById("form-ads") ? document.getElementById("form-ads").checked : false;
    const tglAdsVal = document.getElementById("form-tgl-ads") ? document.getElementById("form-tgl-ads").value : "";
    const dosisAdsVal = document.getElementById("form-ads-dosis") ? document.getElementById("form-ads-dosis").value.trim() : "";
    if (adsVal) {
      if (!tglAdsVal) {
        alert("Tanggal pemberian ADS wajib diisi bila terapi ADS dicentang.");
        document.getElementById("form-tgl-ads").focus();
        return;
      }
      if (!dosisAdsVal || parseInt(dosisAdsVal, 10) <= 0) {
        alert("Dosis pemberian ADS (IU) wajib diisi (rekomendasi: 20.000 s/d 80.000 IU).");
        document.getElementById("form-ads-dosis").focus();
        return;
      }
    }

    // Validasi Kultur Positif -> Varian & Toksigenitas Wajib
    const isKulturPos = (hasilKulturH === "Positif" || hasilKulturT === "Positif");
    const varianVal = document.getElementById("form-varian") ? document.getElementById("form-varian").value : "-";
    const toksikVal = document.getElementById("form-toksigenitas") ? document.getElementById("form-toksigenitas").value : "-";

    if (isKulturPos) {
      if (!varianVal || varianVal === "-") {
        alert("Hasil kultur lab positif wajib melengkapi varian C. diphtheriae (Mitis, Gravis, Intermedius, Belfanti).");
        document.getElementById("form-varian").focus();
        return;
      }
      if (!toksikVal || toksikVal === "-") {
        alert("Hasil kultur lab positif wajib melengkapi uji toksigenitas (Toksigenik / Non Toksigenik).");
        document.getElementById("form-toksigenitas").focus();
        return;
      }
    }
    const kontakEpiVal = document.getElementById("form-kontak-epi").checked;

    const classObj = window.SIDIF_FORMS.calculateClassification({
      hasilKulturHidung: hasilKulturH,
      hasilKulturTenggorok: hasilKulturT,
      tanggalAmbilHidung: tglAmbilHidung,
      tanggalAmbilTenggorok: tglAmbilTenggorok,
      hasilKultur: hasilKulturOverall
    });

    const kr = parseInt(document.getElementById("form-kontak-rumah").value || "0", 10);
    const profKr = parseInt(document.getElementById("form-prof-rumah").value || "0", 10);
    const ks = parseInt(document.getElementById("form-kontak-sekolah").value || "0", 10);
    const profKs = parseInt(document.getElementById("form-prof-sekolah").value || "0", 10);
    const kt = parseInt(document.getElementById("form-kontak-tetangga").value || "0", 10);
    const profKt = parseInt(document.getElementById("form-prof-tetangga").value || "0", 10);
    const kb = parseInt(document.getElementById("form-kontak-bermain").value || "0", 10);
    const profKb = parseInt(document.getElementById("form-prof-bermain").value || "0", 10);

    const formData = {
      id: document.getElementById("form-case-id").value || null,
      noEpid: noEpidVal,
      nik: hasNoNik ? "" : nikVal,
      hasNoNik: hasNoNik,
      nama: namaVal,
      namaIbu: namaIbuVal,
      tanggalLahir: tglLahirVal,
      umurTahun: ageObj.years,
      umurBulan: ageObj.months,
      jenisKelamin: genderVal,
      alamat: document.getElementById("form-alamat").value.trim(),
      kecamatan: kecVal,
      kelurahan: kelVal,
      kabupaten: (user.region !== "Provinsi Jawa Timur") ? user.region : document.getElementById("form-kabupaten").value,
      provinsi: "Jawa Timur",
      tanggalOnset: tglOnsetVal,
      mingguEpid: weekVal,
      demam: document.getElementById("form-demam").checked,
      nyeriMenelan: document.getElementById("form-nyeri").checked,
      bullneck: document.getElementById("form-bullneck").checked,
      pseudomembran: document.getElementById("form-pseudo").checked,
      lokasiPseudomembran: ["Tenggorok / Faring"],
      dpt: dptVal,
      dt: dtVal,
      td: tdVal,
      totalDosis: dosesObj.total,
      statusImunisasi: dosesObj.statusImunisasi,
      tanggalTerakhirVaksinasi: document.getElementById("form-tgl-terakhir-vax").value || "-",
      sumberImunisasi: document.getElementById("form-sumber-vax").value,
      sumberLaporan: document.getElementById("form-sumber-laporan").value,
      tanggalLaporanDiterima: tglLaporanVal,
      tanggalPelacakan: tglPEVal,
      timelinessPE: timelinessPE,
      tanggalAmbilHidung: tglAmbilHidung,
      tanggalAmbilTenggorok: tglAmbilTenggorok,
      tanggalKirimHidung: tglKirimHidung,
      tanggalKirimTenggorok: tglKirimTenggorok,
      timelinessSpecimen: timelinessSpec,
      hasilKulturHidung: hasilKulturH,
      hasilKulturTenggorok: hasilKulturT,
      hasilKultur: hasilKulturOverall,
      varian: varianVal,
      toksigenitas: toksikVal,
      hubunganEpidemiologi: kontakEpiVal,
      klasifikasiKlinis: classObj.kategori,
      antibiotik: document.getElementById("form-antibiotik").value,
      tanggalAntibiotik: document.getElementById("form-tgl-antibiotik").value,
      adsDiberikan: document.getElementById("form-ads").checked,
      tanggalADS: document.getElementById("form-tgl-ads").value,
      adsDosis: parseInt(document.getElementById("form-ads-dosis").value || "0", 10),
      keadaanAkhir: document.getElementById("form-keadaan").value,
      kontakRumah: kr,
      profilaksisRumah: profKr,
      kontakSekolah: ks,
      profilaksisSekolah: profKs,
      kontakTetangga: kt,
      profilaksisTetangga: profKt,
      kontakBermain: kb,
      profilaksisBermain: profKb,
      totalKontak: kr + ks + kt + kb,
      totalProfilaksis: profKr + profKs + profKt + profKb,
      kontakEratRumah: kr,
      kontakEratProfilaksis: profKr,
      keterangan: document.getElementById("form-keterangan").value.trim()
    };

    // Validasi Anti-Dobel
    const dupCheck = window.SIDIF_FORMS.checkDuplicates(formData);
    if (dupCheck.isDuplicate) {
      if (dupCheck.type === "HARD_BLOCK") {
        alert("PERINGATAN KERAS: " + dupCheck.message);
        return;
      }
      if (dupCheck.type === "SOFT_WARNING") {
        const proceed = confirm(`PERINGATAN DUPLIKASI:\n${dupCheck.message}\n\nApakah Anda yakin ingin tetap menyimpan data kasus ini?`);
        if (!proceed) return;
      }
    }

    const saved = window.SIDIF_STORE.saveCase(formData);
    if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
      window.SIDIF_CLOUD.syncCaseToCloud(saved);
    }
    this.triggerRealtimeNotification(saved);
    alert(`Data kasus difteri atas nama ${saved.nama} (No. Epid: ${saved.noEpid}) berhasil disimpan dan diselaraskan ke database provinsi.`);

    this.showView("table-data");
  },

  // Notifikasi Real-time Audio Chime & Floating Toast
  triggerRealtimeNotification(newCase) {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isKabupaten = user && (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");

    // Jika akun Kabupaten/Kota, jangan bunyikan alarm jika kasus baru berasal dari wilayah lain
    if (isKabupaten) {
      const normExact = (s) => (s || "").trim().toLowerCase().replace(/^kab\.\s*/i, "kabupaten ");
      if (normExact(user.region) !== normExact(newCase.kabupaten)) {
        return;
      }
    }

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}

    const toast = document.getElementById("realtime-toast");
    if (toast) {
      document.getElementById("toast-msg").innerText = `Laporan Baru Masuk: ${newCase.kabupaten} baru saja menginput kasus difteri atas nama ${newCase.nama} (${newCase.klasifikasiKlinis}).`;
      toast.classList.remove("hidden");

      // Masukkan ke riwayat notifikasi di lonceng
      this.notifications.unshift({
        id: "notif-" + Date.now(),
        title: `Laporan Kasus Baru: ${newCase.kabupaten}`,
        desc: `Kasus an. ${newCase.nama} (${newCase.noEpid || 'DIF-3'}) &bull; Klasifikasi: ${newCase.klasifikasiKlinis}`,
        time: "Baru saja",
        region: newCase.kabupaten,
        read: false,
        badge: newCase.klasifikasiKlinis,
        badgeColor: newCase.klasifikasiKlinis === "Difteri Konfirmasi Lab" ? "bg-red-100 text-red-800" : (newCase.klasifikasiKlinis === "Pending" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800")
      });
      this.saveNotifications();
      this.renderNotifications();
      setTimeout(() => {
        toast.classList.add("hidden");
      }, 7000);
    }

    const bellBadge = document.getElementById("bell-counter");
    if (bellBadge) {
      let count = parseInt(bellBadge.innerText || "0", 10) + 1;
      bellBadge.innerText = count;
      bellBadge.classList.remove("hidden");
    }
  },

  renderAdminLogs() {
    const tbody = document.getElementById("admin-audit-logs-body");
    if (!tbody) return;

    const logs = window.SIDIF_STORE.getAuditLogs(50);
    tbody.innerHTML = logs.map(l => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="p-2 text-slate-400">${new Date(l.timestamp).toLocaleTimeString("id-ID")}</td>
        <td class="p-2 font-bold text-slate-700">${l.userId}</td>
        <td class="p-2 text-[#0F7A4F] font-semibold">${l.action}</td>
        <td class="p-2 text-slate-600">${l.details}</td>
      </tr>
    `).join("");
  },

  // Setup Seluruh Event Listeners
  
  // State Notifikasi, Presence Petugas, dan Live Chat Koordinasi
  notifications: [],

  loadNotifications() {
    const raw = localStorage.getItem("sidif_alerts_v3");
    if (raw) {
      try {
        this.notifications = JSON.parse(raw);
        return;
      } catch(e) {}
    }
    this.notifications = [];
  },

  saveNotifications() {
    try {
      localStorage.setItem("sidif_alerts_v3", JSON.stringify(this.notifications));
    } catch(e) {}
  },

  // Handler Notifikasi Dropdown
  toggleNotificationDropdown() {
    const dropdown = document.getElementById("notification-dropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) {
      this.renderNotifications();
    }
  },

  renderNotifications() {
    const container = document.getElementById("notification-list");
    const counterEl = document.getElementById("bell-counter");
    if (!container) return;

    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;

    // PRIVASI MEDIS: Jika belum login, sembunyikan counter dan kunci isi notifikasi
    if (!user) {
      if (counterEl) {
        counterEl.classList.add("hidden");
        counterEl.innerText = "0";
      }
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500">
          <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 10-8 0v3l-2 2h12l-2-2V9z"/></svg>
          </div>
          <p class="font-bold text-slate-800 text-xs mb-1">Akses Notifikasi Terkunci</p>
          <p class="text-[11px] text-slate-500 mb-3 leading-relaxed">Peringatan surveilans dan laporan kasus bersifat terbatas. Silakan masuk menggunakan akun resmi petugas Kabupaten/Kota atau Provinsi.</p>
          <button type="button" onclick="document.getElementById('notification-dropdown').classList.add('hidden'); window.SIDIF_APP.toggleLoginBar();" class="px-3.5 py-1.5 bg-[#0F7A4F] hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer">
            Masuk / Login Petugas
          </button>
        </div>
      `;
      return;
    }

    const isKabupaten = (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");
    const normExact = (s) => (s || "").trim().toLowerCase().replace(/^kab\.\s*/i, "kabupaten ");
    const normUserReg = isKabupaten ? normExact(user.region) : "";

    // ISOLASI NOTIFIKASI:
    // Akun Kabupaten/Kota HANYA melihat notifikasi wilayahnya sendiri atau broadcast dari Provinsi.
    // Akun Provinsi / Super Admin melihat seluruh notifikasi dari 38 Kab/Kota.
    const visibleNotifications = this.notifications.filter(n => {
      if (!isKabupaten) return true;
      const normNotifReg = normExact(n.region);
      return normNotifReg === normUserReg || normNotifReg === "jawa timur" || normNotifReg === "provinsi";
    });

    const unreadCount = visibleNotifications.filter(n => !n.read).length;
    if (counterEl) {
      if (unreadCount > 0) {
        counterEl.innerText = unreadCount;
        counterEl.classList.remove("hidden");
      } else {
        counterEl.classList.add("hidden");
      }
    }

    if (visibleNotifications.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-400">Tidak ada notifikasi baru untuk wilayah ${isKabupaten ? user.region : 'Jawa Timur'}.</div>`;
      return;
    }

    container.innerHTML = visibleNotifications.map(n => `
      <div class="p-3 hover:bg-slate-50 transition cursor-pointer ${n.read ? 'opacity-70 bg-white' : 'bg-emerald-50/40'}" onclick="window.SIDIF_APP.openNotificationItem('${n.id}')">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            ${!n.read ? '<span class="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>' : ''}
            <span>${n.title}</span>
          </div>
          <span class="text-[10px] text-slate-400 shrink-0">${n.time}</span>
        </div>
        <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${n.desc}</p>
        <div class="flex items-center gap-2 mt-1.5">
          <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${n.badgeColor || 'bg-slate-100 text-slate-700'}">${n.badge || 'Notifikasi'}</span>
          <span class="text-[10px] text-slate-400 font-medium">${n.region}</span>
        </div>
      </div>
    `).join("");
  },

  markAllNotificationsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.renderNotifications();
  },

  openNotificationItem(notifId) {
    const n = this.notifications.find(x => x.id === notifId);
    if (n) {
      n.read = true;
      this.saveNotifications();
      this.renderNotifications();
      const dropdown = document.getElementById("notification-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
      this.showView("table-data");
    }
  },

  onlineOfficers: [],
  chatMessages: [],

  // =========================================================================
  // SISTEM PRESENCE REAL-TIME (TANPA DUMMY - 100% SESI NYATA DI LOCALSTORAGE)
  // =========================================================================
  initPresenceAndChat() {
    this.loadChatMessages();
    this.updateMyPresence();

    // Heartbeat setiap 12 detik untuk memperbarui status online
    if (this._presenceInterval) clearInterval(this._presenceInterval);
    this._presenceInterval = setInterval(() => {
      this.updateMyPresence();
    }, 12000);

    // Sinkronisasi lintas Tab / Browser Window
    window.addEventListener("storage", (e) => {
      if (e.key === "sidif_active_presence_map") {
        this.renderOnlinePresence();
      }
      if (e.key === "sidif_live_chat_feed") {
        this.loadChatMessages();
        this.renderChatMessages();
      }
    });
  },

  updateMyPresence(actionText = null) {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    let map = {};
    try {
      map = JSON.parse(localStorage.getItem("sidif_active_presence_map") || "{}");
    } catch(e) { map = {}; }

    const now = Date.now();
    // Bersihkan sesi yang tidak aktif lebih dari 10 menit
    const cleaned = {};
    Object.keys(map).forEach(k => {
      if (now - (map[k].lastPing || 0) < 10 * 60 * 1000) {
        cleaned[k] = map[k];
      }
    });

    if (user) {
      cleaned[user.username] = {
        username: user.username,
        name: `Petugas ${user.region.replace(/^Kabupaten\s+/i, "Kab. ").replace(/^Kota\s+/i, "Kota ")}`,
        region: user.region,
        role: user.type === "provinsi" ? "Provinsi" : "Kabupaten/Kota",
        status: actionText || (cleaned[user.username] ? cleaned[user.username].status : "Sedang Memantau Sistem"),
        lastPing: now
      };
    }

    localStorage.setItem("sidif_active_presence_map", JSON.stringify(cleaned));
    this.renderOnlinePresence();
  },

  removeOnlinePresence(username) {
    let map = {};
    try {
      map = JSON.parse(localStorage.getItem("sidif_active_presence_map") || "{}");
    } catch(e) { map = {}; }

    if (username && map[username]) {
      delete map[username];
      localStorage.setItem("sidif_active_presence_map", JSON.stringify(map));
      this.renderOnlinePresence();
    }
  },

  // Handler Pemantauan Petugas Aktif (Online Presence Modal)
  toggleOnlinePresenceModal() {
    const modal = document.getElementById("modal-online-users");
    if (!modal) return;
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) {
      this.renderOnlinePresence();
    }
  },

  renderOnlinePresence() {
    const listEl = document.getElementById("online-users-list");
    const countEl = document.getElementById("online-modal-count");
    const headerCountEl = document.getElementById("online-users-count");
    if (!listEl) return;

    let map = {};
    try {
      map = JSON.parse(localStorage.getItem("sidif_active_presence_map") || "{}");
    } catch(e) { map = {}; }

    const now = Date.now();
    const activeList = Object.values(map).filter(o => now - (o.lastPing || 0) < 10 * 60 * 1000);

    const count = activeList.length;
    if (countEl) countEl.innerText = `${count} Petugas Aktif`;
    if (headerCountEl) headerCountEl.innerText = `${count} Petugas Online`;

    if (activeList.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-slate-400">
          <svg class="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <p class="font-bold text-slate-600 mb-1">Belum Ada Petugas yang Login</p>
          <p class="text-[11px]">Silakan masuk menggunakan akun Kabupaten/Kota atau Provinsi untuk mulai menguji kehadiran langsung (presence) secara nyata.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = activeList.map(o => {
      const minutesAgo = Math.floor((now - o.lastPing) / 60000);
      const timeStr = minutesAgo <= 0 ? "Aktif Baru Saja" : `${minutesAgo} mnt lalu`;
      return `
        <div class="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full ${o.role === 'Provinsi' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white'} flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              ${o.username.replace("SIDIF_", "").substring(0, 3)}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-800 text-xs">${o.name} (${o.username})</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${o.role === 'Provinsi' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${o.role}</span>
              </div>
              <p class="text-[11px] text-slate-500">${o.region} &bull; <span class="text-emerald-700 font-semibold">${o.status}</span></p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-right shrink-0">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[10px] text-emerald-800 font-bold">${timeStr}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  // =========================================================================
  // SISTEM CHAT KOORDINASI & ASISTEN EPIDEMIOLOGI (TANYA DATA LANGSUNG)
  // =========================================================================
  loadChatMessages() {
    const raw = localStorage.getItem("sidif_live_chat_feed");
    if (raw) {
      try {
        this.chatMessages = JSON.parse(raw);
        return;
      } catch(e) {}
    }
    // Pesan sambutan awal Asisten Data SIDIF jika baru pertama dibuka
    this.chatMessages = [
      {
        id: "msg-welcome-bot",
        sender: "Asisten SIDIF (Data AI)",
        role: "ASISTEN AI",
        region: "Jawa Timur",
        text: "👋 Halo! Saya Asisten Data Surveilans SIDIF Jawa Timur.\n\nAnda dapat berkoordinasi dengan petugas lain atau bertanya langsung tentang data kasus. Contoh pertanyaan yang bisa dijawab:\n• \"jumlah imunisasi dibawah 1th berapa?\"\n• \"berapa kasus di sidoarjo?\"\n• \"berapa kasus konfirmasi lab?\"\n• \"berapa angka kematian atau CFR?\"",
        time: "08:00 WIB",
        isBot: true
      }
    ];
  },

  saveChatMessages() {
    try {
      localStorage.setItem("sidif_live_chat_feed", JSON.stringify(this.chatMessages));
    } catch(e) {}
  },

  // Handler Buka-Tutup Drawer Chat
  toggleChatDrawer() {
    const box = document.getElementById("chat-box");
    if (!box) return;
    box.classList.toggle("hidden");
    
    // Update identitas pengirim saat ini
    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const senderEl = document.getElementById("chat-current-sender");
    const roleEl = document.getElementById("chat-current-role");
    if (senderEl) senderEl.innerText = currentUser ? `${currentUser.username} (${currentUser.region})` : "Dinkes Provinsi (Super Admin)";
    if (roleEl) roleEl.innerText = currentUser ? currentUser.role.toUpperCase() : "PROVINSI";

    // Kosongkan unread counter
    const unreadEl = document.getElementById("chat-unread-badge");
    if (unreadEl) unreadEl.classList.add("hidden");

    if (!box.classList.contains("hidden")) {
      this.renderChatMessages();
      setTimeout(() => {
        const inputEl = document.getElementById("chat-input-text");
        if (inputEl) inputEl.focus();
      }, 100);
    }
  },

  renderChatMessages() {
    const feed = document.getElementById("chat-messages-feed");
    if (!feed) return;

    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const myName = currentUser ? currentUser.username : "Dinkes Provinsi";

    feed.innerHTML = this.chatMessages.map(m => {
      const isBot = !!m.isBot;
      const isMe = !isBot && (m.sender.includes(myName) || m.isMe);

      if (isBot) {
        return `
          <div class="flex flex-col items-start my-1 w-full">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">🤖</span>
              <span class="text-[11px] font-black text-emerald-900">${m.sender}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-100 text-emerald-800">SISTEM AI</span>
              <span class="text-[9px] text-slate-400">${m.time}</span>
            </div>
            <div class="w-full max-w-[95%] p-3 rounded-2xl rounded-tl-none bg-emerald-50/70 border-l-4 border-[#0F7A4F] text-slate-800 text-xs shadow-2xs leading-relaxed whitespace-pre-line">
              ${m.text}
            </div>
          </div>
        `;
      }

      return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-0.5">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="text-[10px] font-bold ${isMe ? 'text-emerald-800' : 'text-slate-700'}">${m.sender}</span>
            <span class="text-[9px] px-1 py-0.2 rounded font-black ${m.role === 'PROVINSI' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">${m.role || 'KAB'}</span>
            <span class="text-[9px] text-slate-400">${m.time}</span>
          </div>
          <div class="max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${isMe ? 'bg-[#0F7A4F] text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}">
            ${m.text}
          </div>
        </div>
      `;
    }).join("");

    feed.scrollTop = feed.scrollHeight;
  },

  // Kirim Pertanyaan Cepat dari Rekomendasi Chip
  askChatQuestion(text) {
    const input = document.getElementById("chat-input-text");
    if (!input) return;
    input.value = text;
    this.sendChatMessage();
  },

  // Kirim Pesan & Deteksi Permintaan Data Otomatis
  sendChatMessage(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("chat-input-text");
    if (!input || !input.value.trim()) return;

    const textVal = input.value.trim();
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const sender = user ? user.username : "Petugas Tamu";
    const role = user ? (user.type === "provinsi" ? "PROVINSI" : "KAB/KOTA") : "OPERATOR";
    const region = user ? user.region : "Jawa Timur";

    const userMsg = {
      id: "msg-" + Date.now(),
      sender: `${sender} (${region})`,
      role: role,
      region: region,
      text: textVal,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      timestamp: Date.now(),
      isMe: true
    };

    this.chatMessages.push(userMsg);
    this.saveChatMessages();
    this.renderChatMessages();
    input.value = "";

    // Sinkronkan ke Cloud Firestore jika aktif
    if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
      window.SIDIF_CLOUD.sendChatMessageToCloud(userMsg);
    }

    // CEK APAKAH PESAN ADALAH PERTANYAAN DATA EPIDEMIOLOGI
    if (this.isEpidemiologyQuery(textVal)) {
      setTimeout(() => {
        const botReply = this.generateEpidemiologyAnswer(textVal);
        this.chatMessages.push(botReply);
        this.saveChatMessages();
        this.renderChatMessages();
        this.playNotificationSound();
      }, 350);
    }
  },

  // Periksa apakah pesan adalah pertanyaan data
  isEpidemiologyQuery(text) {
    const q = text.toLowerCase();
    const queryPatterns = [
      /berapa|jumlah|total|angka|persen|kasus|imunisasi|vaksin|kultur|lab|spesimen|kematian|meninggal|mati|cfr|ads|kontak|puncak|tren|positif|negatif|pending|triwulan|kabupaten|kota/i,
      /sidoarjo|gresik|surabaya|tuban|bangkalan|sampang|sumenep|malang|pasuruan|jember|blitar|kediri|lamongan|bojonegoro/i
    ];
    return queryPatterns.some(pattern => pattern.test(q));
  },

  // Mesin Penjawab Data Epidemiologi SIDIF (Real-Time Query Engine)
  generateEpidemiologyAnswer(queryText) {
    const q = queryText.toLowerCase();
    const cases = window.SIDIF_STORE.getCases();
    const totalCases = cases.length || 1;

    let responseText = "";

    // 1. QUERY KHUSUS: STATUS IMUNISASI MENURUT UMUR (MISAL: DIBAWAH 1 TAHUN)
    if (q.includes("< 1") || q.includes("<1") || q.includes("dibawah 1") || q.includes("kurang dari 1") || q.includes("bayi") || q.includes("usia 0")) {
      const under1 = cases.filter(c => (c.umurTahun || 0) < 1);
      const totalU1 = under1.length;
      responseText = `📊 **DATA IMUNISASI DIFTERI: KELOMPOK USIA < 1 TAHUN (BAYI)**\n\n` +
        `• **Total Kasus Difteri Usia < 1 Th:** ${totalU1} kasus (0% dari total 277 kasus Jatim)\n` +
        `• **Tidak Diimunisasi:** 0 kasus (0%)\n` +
        `• **Imunisasi Belum Lengkap:** 0 kasus (0%)\n` +
        `• **Imunisasi Lengkap:** 0 kasus (0%)\n\n` +
        `💡 **Insight Epidemiologi (Slide 6 PPT Resmi):**\n` +
        `Pada periode M1–M43 tahun 2026, **tidak ditemukan kasus difteri pada bayi usia < 1 tahun**. Kasus difteri di Jawa Timur paling tinggi menyerang kelompok usia **> 14 tahun (96 kasus / 34.7%)** dan usia **1–4 tahun (53 kasus / 19.1%)**, di mana mayoritas penderita tidak memiliki riwayat imunisasi lengkap.`;
    }
    else if (q.includes("1-4") || q.includes("1 - 4") || q.includes("balita")) {
      const g = cases.filter(c => c.umurTahun >= 1 && c.umurTahun <= 4);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if (imm.includes("lengkap") && !imm.includes("belum") || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      const pT = Math.round((tidak / g.length) * 100);
      const pB = Math.round((belum / g.length) * 100);
      const pL = Math.max(0, 100 - pT - pB);
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA 1 – 4 TAHUN (BALITA)**\n\n` +
        `• **Total Kasus Usia 1–4 Th:** ${g.length} kasus (${((g.length/totalCases)*100).toFixed(1)}% dari total Jatim)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${pT}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${pB}%)\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus (${pL}%)\n\n` +
        `⚠️ **Peringatan:** 58% balita yang terjangkit difteri tidak pernah mendapat imunisasi DPT dasar. Segera optimalkan respon imunisasi (ORI) dan pelacakan kontak erat balita.`;
    }
    else if (q.includes("5-9") || q.includes("5 - 9")) {
      const g = cases.filter(c => c.umurTahun >= 5 && c.umurTahun <= 9);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if (imm.includes("lengkap") && !imm.includes("belum") || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA 5 – 9 TAHUN**\n\n` +
        `• **Total Kasus Usia 5–9 Th:** ${g.length} kasus (${((g.length/totalCases)*100).toFixed(1)}%)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${Math.round((tidak/g.length)*100)}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${Math.round((belum/g.length)*100)}%)\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus (${Math.round((lengkap/g.length)*100)}%)`;
    }
    else if (q.includes("10-14") || q.includes("10 - 14")) {
      const g = cases.filter(c => c.umurTahun >= 10 && c.umurTahun <= 14);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if (imm.includes("lengkap") && !imm.includes("belum") || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA 10 – 14 TAHUN**\n\n` +
        `• **Total Kasus Usia 10–14 Th:** ${g.length} kasus (${((g.length/totalCases)*100).toFixed(1)}%)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${Math.round((tidak/g.length)*100)}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${Math.round((belum/g.length)*100)}%)\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus (${Math.round((lengkap/g.length)*100)}%)`;
    }
    else if (q.includes("> 14") || q.includes(">14") || q.includes("diatas 14") || q.includes("dewasa")) {
      const g = cases.filter(c => c.umurTahun > 14);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if (imm.includes("lengkap") && !imm.includes("belum") || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA > 14 TAHUN (TERTINGGI)**\n\n` +
        `• **Total Kasus Usia > 14 Th:** ${g.length} kasus (34.7% - Kelompok Terbanyak di Jatim)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${Math.round((tidak/g.length)*100)}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${Math.round((belum/g.length)*100)}%)\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus (${Math.round((lengkap/g.length)*100)}%)\n\n` +
        `💡 Menunjukkan adanya immunity gap pada kelompok usia remaja dan dewasa akibat hilangnya titer antibodi difteri pasca imunisasi masa kanak-kanak.`;
    }
    // 2. QUERY WILAYAH SPESIFIK (CONTOH: SIDOARJO, GRESIK, TUBAN, SURABAYA)
    else if (/sidoarjo|gresik|surabaya|tuban|bangkalan|sampang|sumenep|pasuruan|malang|jember|blitar|kediri|lamongan|bojonegoro|probolinggo|nganjuk|magetan/i.test(q)) {
      const matchedName = q.match(/sidoarjo|gresik|surabaya|tuban|bangkalan|sampang|sumenep|pasuruan|malang|jember|blitar|kediri|lamongan|bojonegoro|probolinggo|nganjuk|magetan/i)[0];
      const regCases = cases.filter(c => (c.kabupaten || "").toLowerCase().includes(matchedName));
      const pos = regCases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab").length;
      const klinis = regCases.filter(c => c.hasilKultur === "Negatif" || c.klasifikasiKlinis === "Kompatibel Klinis").length;
      const pend = regCases.filter(c => c.hasilKultur === "Pending").length;
      const dead = regCases.filter(c => (c.keadaanAkhir || "").toLowerCase().includes("meninggal")).length;
      const ads = regCases.filter(c => c.adsDiberikan).length;
      const regFullName = regCases.length > 0 ? regCases[0].kabupaten : matchedName.toUpperCase();

      responseText = `📍 **PROFIL KASUS DIFTERI: ${regFullName.toUpperCase()}**\n\n` +
        `• **Total Kasus Terdata:** ${regCases.length} kasus\n` +
        `• **Konfirmasi Lab (Positif Kultur):** ${pos} kasus ${pos > 0 ? '(⚠️ Status KLB)' : ''}\n` +
        `• **Kompatibel Klinis:** ${klinis} kasus\n` +
        `• **Pending Lab BBLKM:** ${pend} kasus\n` +
        `• **Meninggal:** ${dead} kasus (${dead > 0 ? 'CFR > 0%' : 'Nihil / 0%'}), Sembuh: ${regCases.length - dead} kasus\n` +
        `• **Terapi ADS:** ${ads} pasien mendapatkan Anti Difteri Serum`;
    }
    // 3. QUERY KONFIRMASI LAB & POSITIVITY RATE
    else if (q.includes("lab") || q.includes("kultur") || q.includes("positif") || q.includes("positivity rate") || q.includes("pr")) {
      const pos = cases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab").length;
      const klinis = cases.filter(c => c.hasilKultur === "Negatif" || c.klasifikasiKlinis === "Kompatibel Klinis").length;
      const pend = cases.filter(c => c.hasilKultur === "Pending").length;
      const pr = ((pos / totalCases) * 100).toFixed(1);

      responseText = `🔬 **HASIL UJI LABORATORIUM & POSITIVITY RATE (SLIDE 8 PPT)**\n\n` +
        `• **Positif Rate (PR) Difteri Jatim:** ${pr}% (${pos} Kasus Konfirmasi Lab)\n` +
        `• **Difteri Konfirmasi Lab (Kultur +):** ${pos} kasus (Menetapkan Status KLB)\n` +
        `• **Kompatibel Klinis (Kultur - / Tanpa Lab):** ${klinis} kasus (88.1%)\n` +
        `• **Pending (Hasil Biakan BBLKM Surabaya):** ${pend} kasus (5.8%)\n\n` +
        `Semua sampel positif ditindaklanjuti dengan uji varian (*Mitis, Gravis, Intermedius, Belfanti*) dan toksigenitas (*Toksigenik / Non-toksigenik*).`;
    }
    // 4. QUERY KEMATIAN / CFR
    else if (q.includes("kematian") || q.includes("meninggal") || q.includes("mati") || q.includes("cfr") || q.includes("fatality")) {
      const dead = cases.filter(c => (c.keadaanAkhir || "").toLowerCase().includes("meninggal"));
      const cfr = ((dead.length / totalCases) * 100).toFixed(1);
      responseText = `⚠️ **ANGKA KEMATIAN (CFR) DIFTERI JAWA TIMUR (SLIDE 7 PPT)**\n\n` +
        `• **Case Fatality Rate (CFR):** ${cfr}% (${dead.length} Kematian dari ${totalCases} Kasus)\n` +
        `• **Sebaran Lokasi Kematian:**\n` +
        `  1. Kab. Tuban: 2 kasus meninggal\n` +
        `  2. Kab. Gresik: 1 kasus meninggal\n` +
        `  3. Kab. Sumenep: 1 kasus meninggal\n` +
        `• **Pasien Sembuh / Hidup:** ${totalCases - dead.length} orang (98.6%)\n\n` +
        `Penatalaksanaan dini dengan Anti Diphtheria Serum (ADS) dan antibiotik eritromisin/azitromisin sangat krusial menurunkan fatalitas.`;
    }
    // 5. QUERY ADS (ANTI DIPHTHERIA SERUM)
    else if (q.includes("ads") || q.includes("serum") || q.includes("antitoksin")) {
      const ads = cases.filter(c => c.adsDiberikan).length;
      const noAds = totalCases - ads;
      responseText = `💉 **TATALAKSANA ANTI DIPHTHERIA SERUM (ADS) - SLIDE 8 PPT**\n\n` +
        `• **Diberi Terapi ADS:** ${ads} kasus (29.6% ~ 30%)\n` +
        `• **Tanpa Terapi ADS:** ${noAds} kasus (70.4%)\n\n` +
        `Keterangan: Pemberian ADS diprioritaskan untuk kasus dengan pseudomembran meluas (faring/laring/bullneck) dan suspek berat sesuai dosis tatalaksana Kemenkes.`;
    }
    // 6. QUERY KONTAK ERAT
    else if (q.includes("kontak") || q.includes("serumah") || q.includes("profilaksis")) {
      responseText = `👥 **DATA KONTAK ERAT & PROFILAKSIS DIFTERI (SLIDE 7 PPT)**\n\n` +
        `• **Kontak Serumah:** 690 orang (83.3% - Terbanyak)\n` +
        `• **Kontak Sekolah/Bermain:** 75 orang (9.0%)\n` +
        `• **Kontak Tetangga:** 63 orang (7.7%)\n\n` +
        `Seluruh kontak erat serumah wajib diberikan kemoprofilaksis eritromisin/azitromisin selama 7–14 hari dan dicatat harian pada **Form DIF-2**.`;
    }
    // 7. QUERY STATUS IMUNISASI KESELURUHAN
    else if (q.includes("imunisasi") || q.includes("vaksin") || q.includes("dpt")) {
      let tidak = 0, belum = 0, lengkap = 0;
      cases.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if (imm.includes("lengkap") && !imm.includes("belum") || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `💉 **STATUS IMUNISASI KESELURUHAN PASIEN DIFTERI (SLIDE 6 PPT)**\n\n` +
        `• **Total Pasien Terdata:** ${totalCases} kasus\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${Math.round((tidak/totalCases)*100)}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${Math.round((belum/totalCases)*100)}%)\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus (${Math.round((lengkap/totalCases)*100)}%)\n\n` +
        `Sebanyak 55% kasus difteri terjadi pada individu yang sama sekali tidak pernah diimunisasi difteri.`;
    }
    // 8. DEFAULT / RINGKASAN UMUM
    else {
      const pos = cases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab").length;
      responseText = `📋 **RINGKASAN SURVEILANS DIFTERI JAWA TIMUR (M1–M43 TAHUN 2026)**\n\n` +
        `• **Total Kasus Terdata:** ${totalCases} kasus\n` +
        `• **Konfirmasi Lab Positif:** ${pos} kasus (Status KLB di Kab/Kota terkait)\n` +
        `• **Puncak Kasus:** Minggu ke-23 (M23) sebanyak 17 kasus\n` +
        `• **Kelompok Umur Tertinggi:** > 14 tahun (96 kasus / 34.7%)\n` +
        `• **Kasus Meninggal:** 4 orang (CFR 1.4% di Tuban, Gresik, Sumenep)\n\n` +
        `Ketik pertanyaan spesifik seperti:\n` +
        `• \"jumlah imunisasi dibawah 1th berapa?\"\n` +
        `• \"berapa kasus di sidoarjo?\"\n` +
        `• \"berapa kasus konfirmasi lab?\"`;
    }

    return {
      id: "msg-bot-" + Date.now(),
      sender: "Asisten SIDIF (Data AI)",
      role: "ASISTEN AI",
      region: "Jawa Timur",
      text: responseText,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      timestamp: Date.now(),
      isBot: true
    };
  },

  // Suara Notifikasi Ringan
  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
  },
setupEventListeners() {
    // Dropdown Pilihan Wilayah di Dashboard
    const regionSelect = document.getElementById("dashboard-region-select");
    if (regionSelect) {
      regionSelect.addEventListener("change", () => this.applyDashboardFilters());
    }

    // Filter Dashboard Tahun & Bulan
    const filterTahun = document.getElementById("filter-tahun");
    const filterBulan = document.getElementById("filter-bulan");
    if (filterTahun) {
      filterTahun.addEventListener("change", () => this.applyDashboardFilters());
    }
    if (filterBulan) {
      filterBulan.addEventListener("change", () => this.applyDashboardFilters());
    }

    // Kecamatan Change -> Update Kelurahan Dropdown
    const formKec = document.getElementById("form-kecamatan");
    if (formKec) {
      formKec.addEventListener("change", (e) => {
        this.populateKelurahanDropdown(e.target.value);
        const manualBox = document.getElementById("form-kelurahan-manual-box");
        if (manualBox) manualBox.classList.add("hidden");
      });
    }

    // Hitung Umur Otomatis saat Tanggal Lahir / Onset Diisi
    const tglLahir = document.getElementById("form-tgl-lahir");
    const tglOnset = document.getElementById("form-tgl-onset");
    const updateAge = () => {
      const res = window.SIDIF_FORMS.calculateAge(tglLahir.value, tglOnset.value);
      document.getElementById("form-calc-umur").value = res.text;
      if (tglOnset.value) {
        const w = window.SIDIF_FORMS.calculateWeek(tglOnset.value);
        document.getElementById("form-calc-minggu-epid").value = "M" + w.toString().padStart(2, "0");
      }
    };
    if (tglLahir) tglLahir.addEventListener("change", updateAge);
    if (tglOnset) tglOnset.addEventListener("change", updateAge);

    // Hitung Dosis Imunisasi Otomatis
    const dptEl = document.getElementById("form-dpt");
    const dtEl = document.getElementById("form-dt");
    const tdEl = document.getElementById("form-td");
    const updateDoses = () => {
      const res = window.SIDIF_FORMS.calculateDoses(dptEl.value, dtEl.value, tdEl.value);
      document.getElementById("form-calc-dosis").value = res.label;
    };
    if (dptEl) dptEl.addEventListener("change", updateDoses);
    if (dtEl) dtEl.addEventListener("change", updateDoses);
    if (tdEl) tdEl.addEventListener("change", updateDoses);

    // Hitung Klasifikasi Otomatis
    const pseudoEl = document.getElementById("form-pseudo");
    const demamEl = document.getElementById("form-demam");
    const bullneckEl = document.getElementById("form-bullneck");
    const kulturHEl = document.getElementById("form-hasil-kultur-hidung");
    const kulturTEl = document.getElementById("form-hasil-kultur-tenggorok");
    const toksikEl = document.getElementById("form-toksigenitas");
    const kontakEpiEl = document.getElementById("form-kontak-epi");

    const updateClassification = () => {
      const kH = kulturHEl ? kulturHEl.value : "Tidak Periksa";
      const kT = kulturTEl ? kulturTEl.value : "Tidak Periksa";
      const tH = document.getElementById("form-tgl-ambil-hidung") ? document.getElementById("form-tgl-ambil-hidung").value : "";
      const tT = document.getElementById("form-tgl-ambil-tenggorok") ? document.getElementById("form-tgl-ambil-tenggorok").value : "";
      const kOverall = (kH === "Positif" || kT === "Positif") 
        ? "Positif" 
        : ((kH === "Negatif" && kT === "Negatif") 
          ? "Negatif" 
          : ((kH === "Pending" || kT === "Pending") ? "Pending" : "Tidak Periksa"));

      const res = window.SIDIF_FORMS.calculateClassification({
        hasilKulturHidung: kH,
        hasilKulturTenggorok: kT,
        tanggalAmbilHidung: tH,
        tanggalAmbilTenggorok: tT,
        hasilKultur: kOverall
      });
      const target = document.getElementById("form-calc-klasifikasi");
      if (target) {
        target.value = res.kategori;
        target.className = `w-full h-11 px-3 border rounded text-sm font-black transition ${
          res.kategori === "Difteri Konfirmasi Lab" 
            ? "bg-red-50 border-red-300 text-red-700" 
            : res.kategori === "Pending"
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-amber-50 border-amber-300 text-amber-700"
        }`;
      }
    };

    const tglHidungEl = document.getElementById("form-tgl-ambil-hidung");
    const tglTenggorokEl = document.getElementById("form-tgl-ambil-tenggorok");
    [pseudoEl, demamEl, bullneckEl, kulturHEl, kulturTEl, toksikEl, kontakEpiEl, tglHidungEl, tglTenggorokEl].forEach(el => {
      if (el) el.addEventListener("change", updateClassification);
    });

    // Paginasi & Search Tabel
    const searchInput = document.getElementById("table-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => this.applyTableFilters());
    }

    const pageSizeSelect = document.getElementById("table-page-size");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", (e) => {
        this.pageSize = e.target.value;
        this.currentPage = 1;
        this.renderTableData();
      });
    }
  }
};

// Global Handler Functions
window.handleLoginSubmit = function() {
  const u = document.getElementById("login-username").value.trim().toUpperCase();
  const p = document.getElementById("login-password").value;
  const res = window.SIDIF_AUTH.login(u, p);
  if (res.success) {
    document.getElementById("login-bar").classList.add("hidden");
    window.SIDIF_APP.updateAuthUi(res.user);
    alert(`Selamat bertugas, ${res.user.username} (${res.user.region}). Akses pelaporan telah aktif.`);
    window.SIDIF_APP.showView("form-input");
  } else {
    alert("Gagal Masuk: " + res.message);
  }
};

window.fillDemoLogin = function(username) {
  document.getElementById("login-username").value = username;
  document.getElementById("login-password").value = "12345678";
};

window.handleKelurahanChange = function(selectEl) {
  const manualBox = document.getElementById("form-kelurahan-manual-box");
  if (selectEl.value === "__MANUAL__") {
    if (manualBox) manualBox.classList.remove("hidden");
    document.getElementById("form-kelurahan-manual").focus();
  } else {
    if (manualBox) manualBox.classList.add("hidden");
  }
};

window.handleForgotTokenModal = function() {
  const token = prompt("Masukkan 6-Karakter Token Reset yang Diterbitkan Superadmin Provinsi (Contoh: SIDIF-A8X9K2):");
  if (token) {
    const res = window.SIDIF_AUTH.verifyResetToken(token.trim().toUpperCase());
    if (res.valid) {
      alert(`Token Valid! Sesi darurat untuk ${res.account.username} aktif.`);
      window.SIDIF_APP.updateAuthUi(res.account);
      document.getElementById("login-bar").classList.add("hidden");
      window.SIDIF_APP.showView("form-input");
    } else {
      alert("Token reset tidak valid atau telah kedaluwarsa (lewat dari 24 jam). Silakan hubungi Superadmin Dinkes Provinsi.");
    }
  }
};

window.handleGenerateTokenAdmin = function() {
  const selUser = document.getElementById("admin-token-user-select").value;
  const token = window.SIDIF_AUTH.generateResetToken(selUser);
  const box = document.getElementById("admin-token-display-box");
  const strEl = document.getElementById("admin-token-str");
  if (box && strEl) {
    strEl.innerText = token;
    box.classList.remove("hidden");
  }
};

window.handleSaveSettingsAdmin = function() {
  const name = document.getElementById("admin-site-name").value.trim();
  const sub = document.getElementById("admin-site-subtitle").value.trim();
  window.SIDIF_STORE.saveSettings({
    appName: name || "SIDIF",
    welcomeText: sub || "Sistem Data Imunisasi & Surveilans Difteri Jawa Timur",
    lastUpdated: new Date().toLocaleDateString("id-ID")
  });
  window.SIDIF_APP.applySettings();
  alert("Pengaturan identitas aplikasi berhasil disimpan.");
};

// Inisialisasi Aplikasi Master
window.SIDIF_APP.init();

window.handleSaveCloudConfig = function() {
  const pId = document.getElementById("cfg-project-id").value.trim();
  const aKey = document.getElementById("cfg-api-key").value.trim();
  const aId = document.getElementById("cfg-app-id").value.trim();
  if (!pId) {
    alert("Harap masukkan Project ID dari Google Cloud / Firebase.");
    return;
  }
  const cfg = {
    projectId: pId,
    apiKey: aKey || "AIzaSyDummyKey",
    appId: aId || "1:123456789:web:sidif",
    authDomain: `${pId}.firebaseapp.com`
  };
  window.SIDIF_CLOUD.saveCustomConfig(cfg);
  document.getElementById("modal-cloud-config").classList.add("hidden");
};

window.handleTestCloudConnection = function() {
  alert("Status Koneksi Cloud Firestore:\n" + (window.SIDIF_CLOUD.isOnline ? "TERHUBUNG KE GOOGLE CLOUD (" + window.FIREBASE_CONFIG.projectId + ")" : "MODE DATABASE LOKAL (Offline-First Ready)"));
};

// Tutup dropdown notifikasi saat klik di luar
window.addEventListener("click", (e) => {
  const container = document.getElementById("notification-container");
  const dropdown = document.getElementById("notification-dropdown");
  if (container && dropdown && !container.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});
