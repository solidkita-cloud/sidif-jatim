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
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    this.updateAuthUi(user);
    this.initPresenceAndChat();

    this.setupEventListeners();
    this.renderTableData();
    if (window.SIDIF_CLOUD) {
      window.SIDIF_CLOUD.init();
    }
  },

  // Terapkan Pengaturan Identitas Situs
  applySettings() {
    const settings = window.SIDIF_STORE.getSettings();
    const siteName = "E-SIDIF";
    const subTitle = "ELEKTRONIK SIMULASI DIFTERI";
    document.querySelectorAll(".site-name-display").forEach(el => el.innerText = siteName);
    document.querySelectorAll(".site-subtitle-display").forEach(el => el.innerText = subTitle);
    document.title = `${siteName} — Elektronik Simulasi Difteri Jawa Timur`;
  },

  // Navigasi Tampilan Antarmuka
  showView(viewName) {
    // 1. Kunci Privasi: Akses ke Tabel Kasus & Form DIF-3 wajib login
    if (viewName === "table-data") {
      const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
      if (!user) {
        alert("Akses Terbatas: Rincian data kasus dan formulir DIF-3 berstatus data medis rahasia. Harap masuk (login) menggunakan akun petugas terlebih dahulu.");
        this.showView("dashboard");
        const loginBar = document.getElementById("login-bar");
        if (loginBar) loginBar.classList.remove("hidden");
        return;
      }
    }

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
    const navTable = document.getElementById("nav-table");
    const navWorklist = document.getElementById("nav-worklist");
    const navAdmin = document.getElementById("nav-admin");
    const notifContainer = document.getElementById("notification-container");
    const onlineBadge = document.getElementById("online-users-badge");
    const notifDropdown = document.getElementById("notification-dropdown");
    const adminExportBtn = document.getElementById("header-admin-export-btn");

    const isSuperAdmin = user && (user.role === "superadmin" || user.username === "SIDIF_PROV");

    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (userBadge) {
        userBadge.classList.remove("hidden");
        document.getElementById("user-display-name").innerText = `${user.username} (${user.region})`;
        this.updateMyPresence("Online di Sistem");
      }
      if (navTable) navTable.classList.remove("hidden");
      if (navWorklist) navWorklist.classList.remove("hidden");
      if (navAdmin && isSuperAdmin) {
        navAdmin.classList.remove("hidden");
      }
      if (adminExportBtn) {
        if (isSuperAdmin) adminExportBtn.classList.remove("hidden");
        else adminExportBtn.classList.add("hidden");
      }
      if (notifContainer) notifContainer.classList.remove("hidden");
      if (onlineBadge) {
        onlineBadge.classList.remove("hidden");
        onlineBadge.classList.add("flex");
      }
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (userBadge) userBadge.classList.add("hidden");
      if (navTable) navTable.classList.add("hidden");
      if (navWorklist) navWorklist.classList.add("hidden");
      if (navAdmin) navAdmin.classList.add("hidden");
      if (adminExportBtn) adminExportBtn.classList.add("hidden");
      if (notifContainer) notifContainer.classList.add("hidden");
      if (onlineBadge) {
        onlineBadge.classList.add("hidden");
        onlineBadge.classList.remove("flex");
      }
      if (notifDropdown) notifDropdown.classList.add("hidden");
    }

    // Segarkan identitas pengirim pada modul chat real-time
    const chatSenderEl = document.getElementById("chat-current-sender");
    const chatRoleEl = document.getElementById("chat-current-role");
    if (chatSenderEl) chatSenderEl.innerText = user ? `${user.username} (${user.region})` : "Dinkes Provinsi (Super Admin)";
    if (chatRoleEl) chatRoleEl.innerText = user ? (user.role || "OPERATOR").toUpperCase() : "PROVINSI";

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
    const konfirmasi = filteredCases.filter(c => c.hasilKultur === "Positif" || c.hasilKulturHidung === "Positif" || c.hasilKulturTenggorok === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
    const meninggal = filteredCases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) : "0.0";
    const adsCount = filteredCases.filter(c => c.adsDiberikan).length;
    const adsPct = totalKasus > 0 ? ((adsCount / totalKasus) * 100).toFixed(1) : "0.0";

    // Hitung Positivity Rate: Positif Lab dibagi Hanya Kasus yang Diperiksa Spesimen Lab
    // Yang tidak diperiksa lab TIDAK menjadi penyebut (masuk ke klasifikasi Kompatibel Klinis)
    const labExaminedCases = filteredCases.filter(c => c.hasilKultur === "Positif" || c.hasilKultur === "Negatif" || c.hasilKulturHidung === "Positif" || c.hasilKulturHidung === "Negatif" || c.hasilKulturTenggorok === "Positif" || c.hasilKulturTenggorok === "Negatif" || (c.statusLab && c.statusLab !== "-") || (c.tanggalAmbilHidung && c.tanggalAmbilHidung !== "-") || (c.tanggalAmbilTenggorok && c.tanggalAmbilTenggorok !== "-"));
    const totalLabExamined = Math.max(labExaminedCases.length, konfirmasi);
    const pr = totalLabExamined > 0 ? ((konfirmasi / totalLabExamined) * 100).toFixed(1) : "0.0";

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

    const fmtKpi = (n) => (n || 0).toLocaleString("id-ID");
    if (kpiTotalEl) kpiTotalEl.innerHTML = `${fmtKpi(totalKasus)} <span class="text-xs font-normal text-slate-500">Kasus</span>`;
    if (kpiSubEl) kpiSubEl.innerText = `Positif: ${fmtKpi(konfirmasi)} Kasus`;
    if (kpiPrEl) kpiPrEl.innerText = `${pr}%`;
    if (kpiSubPrEl) kpiSubPrEl.innerText = `${fmtKpi(konfirmasi)} Positif dari ${fmtKpi(totalLabExamined)} Diperiksa Lab`;
    if (kpiCfrEl) kpiCfrEl.innerText = `${cfr}%`;
    if (kpiSubCfrEl) kpiSubCfrEl.innerText = `${fmtKpi(meninggal)} Kasus Meninggal`;
    if (kpiAdsEl) kpiAdsEl.innerText = `${adsPct}%`;
    if (kpiSubAdsEl) kpiSubAdsEl.innerText = `${fmtKpi(adsCount)} dari ${fmtKpi(totalKasus)} Kasus Diberi ADS`;
    if (kpiKontakEl) kpiKontakEl.innerText = `${fmtKpi(kr)} Orang`;
    if (kpiSubKontakEl) kpiSubKontakEl.innerText = `${fmtKpi(profKr)} Diberi Profilaksis`;

    // Render Ulang Seluruh Grafik (Kurva M1-M43, Usia, Imunisasi, Gender, Kontak, ADS, CFR, Faskes, PE)
    if (window.SIDIF_CHARTS) {
      window.SIDIF_CHARTS.renderAllCharts(filteredCases);
    }

    // Update Peta 2D (Highlight & Zoom ke Wilayah)
    if (window.SIDIF_MAP && window.SIDIF_MAP.geoJsonLayer) {
      window.SIDIF_MAP.applyFilter(selectedYear, selectedMonth);
      window.SIDIF_MAP.focusRegion(selectedRegion);
    }
  },

  // Kembalikan Tampilan Peta dan Dashboard ke Seluruh Jawa Timur (Provinsi)
  resetToProvinceMap() {
    const regionSelectEl = document.getElementById("dashboard-region-select");
    if (regionSelectEl) {
      regionSelectEl.value = "Jawa Timur";
    }
    if (window.SIDIF_MAP) {
      window.SIDIF_MAP.focusRegion("Jawa Timur");
    }
    this.applyDashboardFilters();
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

  // Perhitungan dan Validasi Real-Time pada Form Input (Umur, Imunisasi, Timeliness PE, Klasifikasi)
  updateLiveCalculations() {
    const tglLahir = document.getElementById("form-tgl-lahir") ? document.getElementById("form-tgl-lahir").value : "";
    const tglOnset = document.getElementById("form-tgl-onset") ? document.getElementById("form-tgl-onset").value : "";
    const tglLaporan = document.getElementById("form-tgl-terima-laporan") ? document.getElementById("form-tgl-terima-laporan").value : "";
    const tglPE = document.getElementById("form-tgl-pe") ? document.getElementById("form-tgl-pe").value : "";

    // 1. Umur Pasien Real-Time
    let age = { years: 0, months: 0, text: "-" };
    if (tglLahir && window.SIDIF_FORMS) {
      age = window.SIDIF_FORMS.calculateAge(tglLahir, tglOnset || new Date().toISOString().substring(0, 10));
      const elUmur = document.getElementById("form-calc-umur");
      if (elUmur) elUmur.value = age.text;
    }

    // Pembaruan Dinamis Opsi & Hint DPT sesuai Umur dari Tanggal Lahir (< 1 th: 3x lengkap, >= 1 th: 4x lengkap)
    const dptSelect = document.getElementById("form-dpt");
    const dptHint = document.getElementById("form-dpt-hint");
    if (dptSelect) {
      const opt3 = dptSelect.querySelector('option[value="3"]');
      const opt4 = dptSelect.querySelector('option[value="4"]');
      if (tglLahir && age && age.text !== "-") {
        if (age.years < 1) {
          if (opt3) opt3.textContent = "3 Dosis (Lengkap Bayi < 1 Thn)";
          if (opt4) opt4.textContent = "4 Dosis";
          if (dptHint) dptHint.innerHTML = "💡 <b>Usia &lt; 1 Tahun:</b> 3 dosis DPT-HB-Hib dasar sudah dihitung <b>LENGKAP</b>.";
        } else {
          if (opt3) opt3.textContent = "3 Dosis (Belum Lengkap)";
          if (opt4) opt4.textContent = "4 Dosis (Lengkap Booster Baduta)";
          if (dptHint) dptHint.innerHTML = "💡 <b>Usia ≥ 1 Tahun:</b> Wajib 4 dosis (3 dasar + 1 booster 18 bln) untuk status <b>LENGKAP</b>.";
        }
      } else {
        if (opt3) opt3.textContent = "3 Dosis";
        if (opt4) opt4.textContent = "4 Dosis";
        if (dptHint) dptHint.textContent = "💡 Status lengkap menyesuaikan tanggal lahir pasien.";
      }
    }

    // 2. Status Imunisasi Sesuai Aturan Juknis Kemenkes (<1 th lengkap jika >=3, 1-5 th lengkap jika >=4)
    const dpt = document.getElementById("form-dpt") ? document.getElementById("form-dpt").value : "0";
    const dt = document.getElementById("form-dt") ? document.getElementById("form-dt").value : "0";
    const td = document.getElementById("form-td") ? document.getElementById("form-td").value : "0";
    if (window.SIDIF_FORMS) {
      const doses = window.SIDIF_FORMS.calculateDoses(dpt, dt, td, age.years, age.months);
      const elDosis = document.getElementById("form-calc-dosis");
      if (elDosis) {
        elDosis.value = `${doses.total} Dosis (${doses.statusImunisasi || doses.status})`;
        const stLower = (doses.statusImunisasi || doses.status || "").toLowerCase();
        if (stLower.includes("lengkap") && !stLower.includes("belum")) {
          elDosis.className = "w-full h-11 px-3 bg-emerald-50 border-2 border-emerald-400 rounded text-xs font-black text-emerald-800";
        } else if (stLower.includes("tidak")) {
          elDosis.className = "w-full h-11 px-3 bg-rose-50 border-2 border-rose-300 rounded text-xs font-bold text-rose-800";
        } else {
          elDosis.className = "w-full h-11 px-3 bg-amber-50 border-2 border-amber-300 rounded text-xs font-bold text-amber-800";
        }
      }
    }

    // 3. Minggu Epidemiologi
    if (tglOnset && window.SIDIF_FORMS) {
      const epiWeek = window.SIDIF_FORMS.calculateWeek(tglOnset);
      const elWeek = document.getElementById("form-calc-minggu-epid");
      if (elWeek) elWeek.value = epiWeek;
    }

    // 4. Timeliness PE (< 24 Jam atau < 48 Jam Sesuai Juknis)
    if (tglLaporan && tglPE && window.SIDIF_FORMS) {
      const timeliness = window.SIDIF_FORMS.calculateTimelinessPE(tglLaporan, tglPE);
      const elTime = document.getElementById("form-calc-timeliness-pe");
      if (elTime) {
        elTime.value = timeliness;
        if (timeliness.includes("< 24") || timeliness.includes("< 48")) {
          elTime.className = "w-full h-11 px-3 bg-emerald-50 border-2 border-emerald-400 rounded text-xs font-black text-[#0F7A4F]";
        } else {
          elTime.className = "w-full h-11 px-3 bg-rose-50 border-2 border-rose-300 rounded text-xs font-bold text-rose-700";
        }
      }
    }

    // 5. Klasifikasi Kasus Baku Kemenkes (Hubungan Epidemiologi & Lab)
    const kHidung = document.getElementById("form-hasil-kultur-hidung") ? document.getElementById("form-hasil-kultur-hidung").value : "Pending";
    const kTenggorok = document.getElementById("form-hasil-kultur-tenggorok") ? document.getElementById("form-hasil-kultur-tenggorok").value : "Pending";
    const kontakEpi = document.getElementById("form-kontak-epi") ? document.getElementById("form-kontak-epi").checked : false;

    let overallKultur = "Pending";
    if (kHidung === "Positif" || kTenggorok === "Positif") overallKultur = "Positif";
    else if (kHidung === "Negatif" && kTenggorok === "Negatif") overallKultur = "Negatif";

    if (window.SIDIF_FORMS) {
      const classRes = window.SIDIF_FORMS.calculateClassification({
        hasilKulturHidung: kHidung,
        hasilKulturTenggorok: kTenggorok,
        hasilKultur: overallKultur,
        hubunganEpidemiologi: kontakEpi
      });
      const elKlas = document.getElementById("form-calc-klasifikasi");
      if (elKlas) {
        elKlas.value = classRes.kategori;
        elKlas.className = `w-full h-11 px-3 rounded text-sm font-black transition border-2 ${classRes.badgeClass || 'bg-blue-50 text-blue-700 border-blue-300'}`;
      }
    }
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

  // Kontrol Input Tanggal Sembuh vs Tanggal Meninggal Berdasarkan Keadaan Akhir
  handleKeadaanChange() {
    const sel = document.getElementById("form-keadaan");
    if (!sel) return;
    const val = sel.value;
    const boxSembuh = document.getElementById("box-tgl-sembuh");
    const boxMeninggal = document.getElementById("box-tgl-meninggal");

    if (val === "Hidup / Sembuh") {
      if (boxSembuh) boxSembuh.classList.remove("hidden");
      if (boxMeninggal) boxMeninggal.classList.add("hidden");
    } else if (val === "Meninggal Dunia") {
      if (boxSembuh) boxSembuh.classList.add("hidden");
      if (boxMeninggal) boxMeninggal.classList.remove("hidden");
    } else {
      if (boxSembuh) boxSembuh.classList.add("hidden");
      if (boxMeninggal) boxMeninggal.classList.add("hidden");
    }
  },

  // Kontrol Dropdown Sumber Laporan Faskes (Puskesmas / RS / Klinik / Dinkes / Lainnya)
  handleSumberLaporanChange(val) {
    const wrap = document.getElementById("wrapper-sumber-lainnya");
    const manualInput = document.getElementById("form-sumber-lainnya-text");
    const targetLocked = document.getElementById("form-sumber-laporan");
    if (val === "Lainnya") {
      if (wrap) wrap.classList.remove("hidden");
      if (manualInput) {
        manualInput.focus();
        if (targetLocked) targetLocked.value = manualInput.value || "Lainnya";
      }
    } else {
      if (wrap) wrap.classList.add("hidden");
      if (manualInput) manualInput.value = "";
      if (targetLocked) targetLocked.value = val;
    }
  },

  // Sinkronkan Teks Sumber Laporan Lainnya ke Input Terkunci Bagian II
  syncSumberLaporan() {
    const manualInput = document.getElementById("form-sumber-lainnya-text");
    const targetLocked = document.getElementById("form-sumber-laporan");
    if (targetLocked && manualInput) {
      targetLocked.value = manualInput.value.trim() || "Lainnya";
    }
  },

  // Toggle Riwayat Kontak Kasus 14 Hari Sebelum Sakit (Bagian VII)
  togglePernahKontakDetail(val) {
    const wrap = document.getElementById("wrapper-pernah-kontak-detail");
    if (!wrap) return;
    if (val === "Ya") {
      wrap.classList.remove("hidden");
    } else {
      wrap.classList.add("hidden");
    }
  },

  // Toggle Riwayat Bepergian ke Daerah KLB 14 Hari Sebelum Sakit (Bagian VII)
  toggleBepergianDetail(val) {
    const wrap = document.getElementById("wrapper-bepergian-detail");
    if (!wrap) return;
    if (val === "Ya") {
      wrap.classList.remove("hidden");
    } else {
      wrap.classList.add("hidden");
    }
  },

  // Manajemen Baris Kontak Erat Dinamis (Form DIF-1 Halaman 3)
  addContactRow(contact = null) {
    const tbody = document.getElementById("contacts-entry-table-body");
    if (!tbody) return;
    const rowIdx = tbody.querySelectorAll("tr.contact-data-row").length + 1;
    const tr = document.createElement("tr");
    tr.className = "contact-data-row border-b border-slate-200 hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-2 text-center font-bold text-slate-500 row-number">${rowIdx}</td>
      <td class="p-2">
        <input type="text" placeholder="Nama lengkap..." value="${contact?.nama || ''}" oninput="window.SIDIF_APP.syncContactsSummary()" class="contact-nama w-full h-8 px-2 border border-slate-300 rounded text-xs font-semibold">
      </td>
      <td class="p-2">
        <input type="number" placeholder="Umur" value="${contact?.umur || ''}" min="0" max="120" class="contact-umur w-full h-8 px-1 text-center border border-slate-300 rounded text-xs">
      </td>
      <td class="p-2">
        <select onchange="window.SIDIF_APP.syncContactsSummary()" class="contact-hubungan w-full h-8 px-1 border border-slate-300 rounded text-xs">
          <option value="Serumah" ${contact?.hubungan === 'Serumah' ? 'selected' : ''}>Serumah</option>
          <option value="Sekolah / Bermain" ${contact?.hubungan === 'Sekolah / Bermain' ? 'selected' : ''}>Sekolah / Bermain</option>
          <option value="Tetangga" ${contact?.hubungan === 'Tetangga' ? 'selected' : ''}>Tetangga</option>
          <option value="Tempat Kerja" ${contact?.hubungan === 'Tempat Kerja' ? 'selected' : ''}>Tempat Kerja</option>
        </select>
      </td>
      <td class="p-2">
        <select class="contact-gejala w-full h-8 px-1 border border-slate-300 rounded text-xs">
          <option value="Tidak Ada" ${contact?.gejala === 'Tidak Ada' ? 'selected' : ''}>Tidak Ada Gejala</option>
          <option value="Nyeri Menelan" ${contact?.gejala === 'Nyeri Menelan' ? 'selected' : ''}>Nyeri Menelan</option>
          <option value="Pseudomembran" ${contact?.gejala === 'Pseudomembran' ? 'selected' : ''}>Ada Pseudomembran</option>
        </select>
      </td>
      <td class="p-2">
        <select class="contact-imunisasi w-full h-8 px-1 border border-slate-300 rounded text-xs">
          <option value="Lengkap" ${contact?.imunisasi === 'Lengkap' ? 'selected' : ''}>Lengkap</option>
          <option value="Belum Lengkap" ${contact?.imunisasi === 'Belum Lengkap' ? 'selected' : ''}>Belum Lengkap</option>
          <option value="Tidak Diimunisasi" ${contact?.imunisasi === 'Tidak Diimunisasi' ? 'selected' : ''}>Tidak Pernah</option>
          <option value="Tidak Tahu" ${contact?.imunisasi === 'Tidak Tahu' ? 'selected' : ''}>Tidak Tahu</option>
        </select>
      </td>
      <td class="p-2 text-center">
        <select onchange="window.SIDIF_APP.syncContactsSummary()" class="contact-profilaksis w-full h-8 px-1 border border-slate-300 rounded text-xs font-semibold bg-emerald-50 text-emerald-900">
          <option value="Ya" ${contact?.profilaksis !== 'Tidak' ? 'selected' : ''}>Ya (Diberikan)</option>
          <option value="Tidak" ${contact?.profilaksis === 'Tidak' ? 'selected' : ''}>Tidak</option>
        </select>
      </td>
      <td class="p-2 text-center">
        <button type="button" onclick="this.closest('tr').remove(); window.SIDIF_APP.syncContactsSummary();" class="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer" title="Hapus Kontak">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
    this.syncContactsSummary();
  },

  syncContactsSummary() {
    const rows = document.querySelectorAll("#contacts-entry-table-body tr.contact-data-row");
    let kr = 0, profKr = 0;
    let ks = 0, profKs = 0;
    let kt = 0, profKt = 0;
    let kb = 0, profKb = 0;

    rows.forEach((tr, i) => {
      const numEl = tr.querySelector(".row-number");
      if (numEl) numEl.innerText = (i + 1);
      const nama = tr.querySelector(".contact-nama")?.value.trim() || "";
      const hub = tr.querySelector(".contact-hubungan")?.value || "Serumah";
      const prof = tr.querySelector(".contact-profilaksis")?.value || "Ya";

      if (nama) {
        if (hub === "Serumah") {
          kr++;
          if (prof === "Ya") profKr++;
        } else if (hub === "Sekolah / Bermain") {
          ks++;
          if (prof === "Ya") profKs++;
        } else if (hub === "Tetangga") {
          kt++;
          if (prof === "Ya") profKt++;
        } else {
          kb++;
          if (prof === "Ya") profKb++;
        }
      }
    });

    if (rows.length > 0) {
      if (document.getElementById("form-kontak-rumah")) document.getElementById("form-kontak-rumah").value = kr;
      if (document.getElementById("form-prof-rumah")) document.getElementById("form-prof-rumah").value = profKr;
      if (document.getElementById("form-kontak-sekolah")) document.getElementById("form-kontak-sekolah").value = ks;
      if (document.getElementById("form-prof-sekolah")) document.getElementById("form-prof-sekolah").value = profKs;
      if (document.getElementById("form-kontak-tetangga")) document.getElementById("form-kontak-tetangga").value = kt;
      if (document.getElementById("form-prof-tetangga")) document.getElementById("form-prof-tetangga").value = profKt;
      if (document.getElementById("form-kontak-bermain")) document.getElementById("form-kontak-bermain").value = kb;
      if (document.getElementById("form-prof-bermain")) document.getElementById("form-prof-bermain").value = profKb;
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
        alert(`AKSES DITOLAK: Anda sedang masuk sebagai petugas ${currentUser.username} (${currentUser.region}).\n\nAnda hanya berwenang mengubah kasus untuk wilayah Anda: ${currentUser.region}.`);
        return;
      }
    }

    this.showView("form-input");

    // Identitas Pelapor Bagian I
    if (document.getElementById("form-pelapor-nama")) document.getElementById("form-pelapor-nama").value = c.pelaporNama || c.createdBy || "";
    if (document.getElementById("form-pelapor-nip")) document.getElementById("form-pelapor-nip").value = c.pelaporNip || "";
    if (document.getElementById("form-pelapor-kantor")) document.getElementById("form-pelapor-kantor").value = c.pelaporKantor || (c.sumberLaporan || "");
    if (document.getElementById("form-pelapor-jabatan")) document.getElementById("form-pelapor-jabatan").value = c.pelaporJabatan || "";
    if (document.getElementById("form-tgl-terima-laporan")) document.getElementById("form-tgl-terima-laporan").value = c.tanggalLaporanDiterima || "";
    if (document.getElementById("form-tgl-pe")) document.getElementById("form-tgl-pe").value = c.tanggalPelacakan || "";

    // Sinkronisasi Sumber Laporan Bagian I & II
    const pelaporSumberEl = document.getElementById("form-pelapor-sumber");
    const sumberManualWrapper = document.getElementById("wrapper-sumber-lainnya");
    const sumberManualText = document.getElementById("form-sumber-lainnya-text");
    const sumberLaporanLocked = document.getElementById("form-sumber-laporan");
    const sLaporan = c.sumberLaporan || c.pelaporKantor || "Puskesmas";
    if (pelaporSumberEl) {
      const standardSources = ["Puskesmas", "Rumah Sakit", "Klinik swasta", "Dinas Kesehatan"];
      if (standardSources.includes(sLaporan)) {
        pelaporSumberEl.value = sLaporan;
        if (sumberManualWrapper) sumberManualWrapper.classList.add("hidden");
        if (sumberManualText) sumberManualText.value = "";
      } else {
        pelaporSumberEl.value = "Lainnya";
        if (sumberManualWrapper) sumberManualWrapper.classList.remove("hidden");
        if (sumberManualText) sumberManualText.value = sLaporan;
      }
    }
    if (sumberLaporanLocked) sumberLaporanLocked.value = sLaporan;

    document.getElementById("form-case-id").value = c.id;

    // Cek Status VOID Dokumen
    const bannerVoid = document.getElementById("banner-case-void");
    const voidBadge = document.getElementById("void-no-epid-badge");
    const btnVoid = document.getElementById("btn-void-case");
    const btnSubmit = document.getElementById("btn-submit-case");
    const submitLabel = document.getElementById("btn-submit-label");

    const isVoid = c.statusAdmin === "VOID" || c.isVoid;
    if (isVoid) {
      if (bannerVoid) bannerVoid.classList.remove("hidden");
      if (voidBadge) voidBadge.innerText = c.noEpid || "";
      if (btnVoid) btnVoid.classList.add("hidden");
      if (btnSubmit) btnSubmit.classList.add("hidden");
    } else {
      if (bannerVoid) bannerVoid.classList.add("hidden");
      if (btnVoid) btnVoid.classList.remove("hidden");
      if (btnSubmit) btnSubmit.classList.remove("hidden");
      if (submitLabel) submitLabel.innerText = "SIMPAN PERUBAHAN DOKUMEN";
    }

    // No. EPID: Cukup tampilkan angka tanpa 'D-' karena prefix D- sudah ada di badge
    const cleanNoEpid = (c.noEpid || "").replace(/^D\s*-\s*/i, "");
    if (document.getElementById("form-no-epid")) document.getElementById("form-no-epid").value = cleanNoEpid;
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

    // Field Baru Bagian II: Pekerjaan, Telepon, TB, BB
    if (document.getElementById("form-pekerjaan")) document.getElementById("form-pekerjaan").value = c.pekerjaan || "Belum Bekerja / Balita";
    if (document.getElementById("form-telepon")) document.getElementById("form-telepon").value = c.telepon || "";
    if (document.getElementById("form-tb")) document.getElementById("form-tb").value = (c.tinggiBadan !== undefined && c.tinggiBadan !== null) ? c.tinggiBadan : "";
    if (document.getElementById("form-bb")) document.getElementById("form-bb").value = (c.beratBadan !== undefined && c.beratBadan !== null) ? c.beratBadan : "";

    // Gejala
    if (document.getElementById("form-demam")) document.getElementById("form-demam").checked = !!c.demam;
    if (document.getElementById("form-nyeri")) document.getElementById("form-nyeri").checked = !!c.nyeriMenelan;
    if (document.getElementById("form-bullneck")) document.getElementById("form-bullneck").checked = !!c.bullneck;
    if (document.getElementById("form-pseudo")) document.getElementById("form-pseudo").checked = !!c.pseudomembran;
    if (document.getElementById("form-gejala-lain")) document.getElementById("form-gejala-lain").value = c.gejalaLain || "";

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
    if (document.getElementById("form-obat-lain")) document.getElementById("form-obat-lain").value = c.obatLain || "";
    if (document.getElementById("form-keadaan")) document.getElementById("form-keadaan").value = c.keadaanAkhir || "Hidup / Sembuh";
    if (document.getElementById("form-tgl-sembuh")) document.getElementById("form-tgl-sembuh").value = c.tanggalSembuh || "";
    if (document.getElementById("form-tgl-meninggal")) document.getElementById("form-tgl-meninggal").value = c.tanggalMeninggal || "";
    this.handleKeadaanChange();

    if (document.getElementById("form-ads")) document.getElementById("form-ads").checked = !!c.adsDiberikan;
    if (document.getElementById("form-tgl-ads")) document.getElementById("form-tgl-ads").value = c.tanggalADS !== "-" ? (c.tanggalADS || "") : "";
    if (document.getElementById("form-ads-dosis")) document.getElementById("form-ads-dosis").value = c.adsDosis || "";

    // Bagian VII: Riwayat Kontak & Bepergian 14 Hari Sebelum Sakit
    const kontakPernah = c.pernahKontakDifteri || "Tidak";
    if (document.getElementById("form-pernah-kontak-difteri")) {
      document.getElementById("form-pernah-kontak-difteri").value = kontakPernah;
      this.togglePernahKontakDetail(kontakPernah);
    }
    if (document.getElementById("form-kontak-kasus-nama")) document.getElementById("form-kontak-kasus-nama").value = c.kontakKasusNama || "";
    if (document.getElementById("form-kontak-kasus-hubungan")) document.getElementById("form-kontak-kasus-hubungan").value = c.kontakKasusHubungan || "";
    if (document.getElementById("form-kontak-kasus-tgl")) document.getElementById("form-kontak-kasus-tgl").value = c.kontakKasusTgl || "";

    const bepergianPernah = c.pernahBepergianKlb || "Tidak";
    if (document.getElementById("form-pernah-bepergian-klb")) {
      document.getElementById("form-pernah-bepergian-klb").value = bepergianPernah;
      this.toggleBepergianDetail(bepergianPernah);
    }
    if (document.getElementById("form-travel-daerah")) document.getElementById("form-travel-daerah").value = c.travelDaerah || "";
    if (document.getElementById("form-travel-tgl")) document.getElementById("form-travel-tgl").value = c.travelTgl || "";

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

    // Render Kontak Erat Dinamis
    const contactTbody = document.getElementById("contacts-entry-table-body");
    if (contactTbody) {
      contactTbody.innerHTML = "";
      if (Array.isArray(c.kontakList) && c.kontakList.length > 0) {
        c.kontakList.forEach(k => this.addContactRow(k));
      } else {
        // Baris awal jika belum ada
        this.addContactRow({ hubungan: "Serumah", profilaksis: "Ya" });
        this.addContactRow({ hubungan: "Sekolah / Bermain", profilaksis: "Ya" });
      }
    }

    this.updateLabConditionalFields();
    this.handleAntibiotikChange();
    this.handleAdsChange();
    this.updateLiveCalculations();
  },

  // Reset Formulir dan Bersihkan Input (Tanpa Default 0)
  resetFormFields() {
    const form = document.getElementById("main-dif3-form");
    if (form) form.reset();

    if (document.getElementById("form-case-id")) document.getElementById("form-case-id").value = "";

    // Reset Banner VOID dan Tombol Aksi
    const bannerVoid = document.getElementById("banner-case-void");
    const btnVoid = document.getElementById("btn-void-case");
    const btnSubmit = document.getElementById("btn-submit-case");
    const submitLabel = document.getElementById("btn-submit-label");
    if (bannerVoid) bannerVoid.classList.add("hidden");
    if (btnVoid) btnVoid.classList.add("hidden");
    if (btnSubmit) btnSubmit.classList.remove("hidden");
    if (submitLabel) submitLabel.innerText = "SIMPAN & AJUKAN KASUS (DIF-1)";

    // Reset Sumber Laporan
    const pelaporSumberEl = document.getElementById("form-pelapor-sumber");
    const sumberManualWrapper = document.getElementById("wrapper-sumber-lainnya");
    const sumberManualText = document.getElementById("form-sumber-lainnya-text");
    const sumberLaporanLocked = document.getElementById("form-sumber-laporan");
    if (pelaporSumberEl) pelaporSumberEl.value = "Puskesmas";
    if (sumberManualWrapper) sumberManualWrapper.classList.add("hidden");
    if (sumberManualText) sumberManualText.value = "";
    if (sumberLaporanLocked) sumberLaporanLocked.value = "Puskesmas";

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
      document.getElementById("form-no-epid").value = userCurr ? window.SIDIF_FORMS.generateNoEpid(userCurr.region, null, null, "digits") : "";
    }

    // Bersihkan Isian Pasien
    ["form-nik", "form-nama", "form-nama-ibu", "form-telepon", "form-alamat", "form-rt-rw", "form-kelurahan",
     "form-tb", "form-bb", "form-gejala-lain", "form-obat-lain", "form-sumber-lainnya-text",
     "form-kontak-kasus-nama", "form-kontak-kasus-hubungan", "form-kontak-kasus-tgl",
     "form-travel-daerah", "form-travel-tgl"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    if (document.getElementById("form-pekerjaan")) document.getElementById("form-pekerjaan").value = "Belum Bekerja / Balita";
    if (document.getElementById("form-no-nik-chk")) {
      document.getElementById("form-no-nik-chk").checked = false;
      if (document.getElementById("form-nik")) document.getElementById("form-nik").disabled = false;
    }

    // Reset Riwayat Kontak & Travel Bagian VII
    if (document.getElementById("form-pernah-kontak-difteri")) {
      document.getElementById("form-pernah-kontak-difteri").value = "Tidak";
      this.togglePernahKontakDetail("Tidak");
    }
    if (document.getElementById("form-pernah-bepergian-klb")) {
      document.getElementById("form-pernah-bepergian-klb").value = "Tidak";
      this.toggleBepergianDetail("Tidak");
    }

    // Bersihkan Tanggal-Tanggal
    ["form-tgl-lahir", "form-tgl-onset", "form-tgl-terima-laporan", "form-tgl-pe", "form-tgl-terakhir-vax",
     "form-tgl-ambil-hidung", "form-tgl-ambil-tenggorok", "form-tgl-kirim-hidung", "form-tgl-kirim-tenggorok",
     "form-tgl-antibiotik", "form-tgl-ads", "form-tgl-sembuh", "form-tgl-meninggal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Uncheck Gejala & Komorbid
    ["form-demam", "form-nyeri", "form-bullneck", "form-pseudo", "form-kontak-epi", "form-ads"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    // Reset Dropdown Imunisasi & Hasil Lab
    if (document.getElementById("form-dpt")) document.getElementById("form-dpt").value = "0";
    if (document.getElementById("form-dt")) document.getElementById("form-dt").value = "0";
    if (document.getElementById("form-td")) document.getElementById("form-td").value = "0";
    if (document.getElementById("form-hasil-kultur-hidung")) document.getElementById("form-hasil-kultur-hidung").value = "Pending";
    if (document.getElementById("form-hasil-kultur-tenggorok")) document.getElementById("form-hasil-kultur-tenggorok").value = "Pending";
    if (document.getElementById("form-keadaan")) document.getElementById("form-keadaan").value = "Hidup / Sembuh";
    this.handleKeadaanChange();

    if (document.getElementById("form-antibiotik")) document.getElementById("form-antibiotik").value = "Eritromisin (Oral 40 mg/kgBB/hari 14 Hari - Rekomendasi Utama)";
    this.handleAntibiotikChange();
    this.handleAdsChange();
    this.updateLabConditionalFields();

    // Reset Kontak Erat dan Tabel Kontak Dinamis
    ["form-ads-dosis", "form-kontak-rumah", "form-prof-rumah", "form-kontak-sekolah", "form-prof-sekolah",
     "form-kontak-tetangga", "form-prof-tetangga", "form-kontak-bermain", "form-prof-bermain", "form-keterangan"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const contactTbody = document.getElementById("contacts-entry-table-body");
    if (contactTbody) {
      contactTbody.innerHTML = "";
      this.addContactRow({ hubungan: "Serumah", profilaksis: "Ya" });
      this.addContactRow({ hubungan: "Sekolah / Bermain", profilaksis: "Ya" });
    }

    this.selectGender("L");

    if (document.getElementById("form-calc-umur")) document.getElementById("form-calc-umur").value = "-";
    if (document.getElementById("form-calc-dosis")) document.getElementById("form-calc-dosis").value = "0 Dosis (Belum Pernah)";
    if (document.getElementById("form-calc-klasifikasi")) document.getElementById("form-calc-klasifikasi").value = "Suspek Difteri";
    if (document.getElementById("form-calc-minggu-epid")) document.getElementById("form-calc-minggu-epid").value = "M01";
    if (document.getElementById("form-calc-timeliness-pe")) document.getElementById("form-calc-timeliness-pe").value = "< 24 Jam";

    this.updateLiveCalculations();
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
  // Tampilkan Rincian 4 Indikator Wilayah Terpilih pada Kartu Samping Peta
  updateRegionDetailCard(data, displayName) {
    const cardName = document.getElementById("card-region-name");
    const cardKasus = document.getElementById("card-region-kasus");
    const cardPositif = document.getElementById("card-region-positif");
    const cardAds = document.getElementById("card-region-ads");
    const cardMeninggal = document.getElementById("card-region-meninggal");
    const cardExpl = document.getElementById("card-region-explanation");

    if (!cardName) return;

    const fmt = (n) => (n || 0).toLocaleString("id-ID");
    cardName.innerText = displayName;

    let m = data || {};
    if ((m.positif === undefined || m.ads === undefined || m.meninggal === undefined) && window.SIDIF_MAP && window.SIDIF_MAP.getRegionMetrics) {
      m = window.SIDIF_MAP.getRegionMetrics(displayName);
    }

    if (cardKasus) cardKasus.innerText = `${fmt(m.kasus)} Kasus`;
    if (cardPositif) cardPositif.innerText = `${fmt(m.positif)} Kasus`;
    if (cardAds) cardAds.innerText = `${fmt(m.ads)} Kasus`;
    if (cardMeninggal) cardMeninggal.innerText = `${fmt(m.meninggal)} Kasus`;

    if (cardExpl) {
      if (m.kasus === 0) {
        cardExpl.innerText = `Wilayah ${displayName} tidak melaporkan temuan kasus difteri aktif. Cakupan imunisasi balita dalam pengawasan rutin dinas.`;
      } else if (m.positif > 0) {
        cardExpl.innerText = `Ditemukan ${fmt(m.positif)} kasus konfirmasi positif kuman toksigenik (KLB). Penyelidikan epidemiologi, pelacakan kontak erat, dan pemberian terapi ADS telah dituntaskan.`;
      } else {
        cardExpl.innerText = `Wilayah melaporkan ${fmt(m.kasus)} kasus dengan tanda klinis khas difteri. Spesimen usap dalam pemantauan laboratorium rujukan BBLKM Surabaya.`;
      }
    }
  },

  // Modal Handler Khusus Super Admin: Ekspor Data & Laporan Surveilans
  openSuperAdminExportModal() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user || (user.role !== "superadmin" && user.username !== "SIDIF_PROV")) {
      alert("Akses Terbatas: Hanya Super Admin yang berwenang membuka portal unduh laporan eksekutif.");
      return;
    }

    const modal = document.getElementById("modal-superadmin-export");
    if (!modal) return;

    // Sinkronkan daftar 38 Kabupaten / Kota pada dropdown filter
    const selEl = document.getElementById("export-filter-region");
    if (selEl && window.SIDIF_FORMS && selEl.options.length <= 1) {
      const regions = Object.values(window.SIDIF_FORMS.KODE_WILAYAH_JATIM).sort((a,b) => parseInt(a.code,10) - parseInt(b.code,10));
      selEl.innerHTML = `<option value="all">Seluruh Jawa Timur (38 Kab/Kota)</option>` + 
        regions.map(r => `<option value="${r.name}">${r.code} - ${r.name}</option>`).join("");
    }

    modal.classList.remove("hidden");
  },

  handleExportPeriodTypeChange(val) {
    const boxMonth = document.getElementById("export-box-month");
    const boxQuarter = document.getElementById("export-box-quarter");
    const boxCustom = document.getElementById("export-box-custom");

    if (boxMonth) boxMonth.classList.add("hidden");
    if (boxQuarter) boxQuarter.classList.add("hidden");
    if (boxCustom) boxCustom.classList.add("hidden");

    if (val === "month" && boxMonth) boxMonth.classList.remove("hidden");
    if (val === "quarter" && boxQuarter) boxQuarter.classList.remove("hidden");
    if (val === "custom" && boxCustom) boxCustom.classList.remove("hidden");
  },

  triggerCustomExportSubmit() {
    const region = document.getElementById("export-filter-region") ? document.getElementById("export-filter-region").value : "all";
    const periodType = document.getElementById("export-filter-period-type") ? document.getElementById("export-filter-period-type").value : "all";
    const month = document.getElementById("export-filter-month") ? document.getElementById("export-filter-month").value : "1";
    const quarter = document.getElementById("export-filter-quarter") ? document.getElementById("export-filter-quarter").value : "1";
    const startDate = document.getElementById("export-filter-start-date") ? document.getElementById("export-filter-start-date").value : "";
    const endDate = document.getElementById("export-filter-end-date") ? document.getElementById("export-filter-end-date").value : "";

    window.SIDIF_EXPORT.exportCustomRekapExcel({
      region,
      periodType,
      month,
      quarter,
      startDate,
      endDate
    });
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
        const isVoid = c.statusAdmin === "VOID" || c.isVoid;
        const isKonf = c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab";
        const isDead = c.keadaanAkhir === "Meninggal Dunia";

        let badgeKlas = isKonf 
          ? `<span class="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded uppercase">Konfirmasi Lab</span>`
          : `<span class="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded uppercase">Klinis</span>`;
        if (isVoid) {
          badgeKlas = `<span class="px-2 py-0.5 bg-red-200 text-red-900 font-black text-[10px] rounded uppercase">DIBATALKAN (VOID)</span>`;
        }

        const badgeKeadaan = isVoid
          ? `<span class="text-slate-400 font-semibold italic text-[11px]">Dokumen Batal</span>`
          : (isDead
            ? `<span class="text-red-600 font-bold">Meninggal</span>`
            : `<span class="text-emerald-700 font-medium">Hidup / Sembuh</span>`);

        const jkDisplay = c.jenisKelamin === "L" 
          ? `<span class="text-blue-600 font-bold">L</span>` 
          : `<span class="text-pink-600 font-bold">P</span>`;

        const noEpidDisplay = isVoid
          ? `<span class="line-through text-red-600 font-bold">${c.noEpid || "-"}</span> <span class="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded uppercase ml-1">VOID</span>`
          : `<span class="font-mono font-bold text-slate-800">${c.noEpid || "-"}</span>`;

        const rowBg = isVoid ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-slate-50";

        return `
          <tr class="${rowBg} transition border-b border-slate-100">
            <td class="p-3">${noEpidDisplay}</td>
            <td class="p-3">
              <span class="font-bold ${isVoid ? 'text-slate-500 line-through' : 'text-slate-900'} block">${c.nama}</span>
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
                <button type="button" onclick="window.SIDIF_APP.editCase('${c.id}')" class="px-2.5 py-1.5 ${isVoid ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'} text-[11px] font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer" title="${isVoid ? 'Lihat dokumen yang dibatalkan' : 'Edit dan perbarui hasil lab'}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  <span>${isVoid ? 'Lihat VOID' : 'Edit / Update Lab'}</span>
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

  // Simpan Formulir Kasus Difteri (Mencakup 53 Kolom Baku Sesuai DIF-1 & DIF-3)
  handleFormSubmit() {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user) {
      alert("Harap login terlebih dahulu.");
      return;
    }

    // 1. Validasi Bagian I: Identitas Pelapor (Petugas PE)
    const pelaporNamaVal = document.getElementById("form-pelapor-nama") ? document.getElementById("form-pelapor-nama").value.trim() : "";
    const pelaporNipVal = document.getElementById("form-pelapor-nip") ? document.getElementById("form-pelapor-nip").value.trim() : "";
    const pelaporKantorVal = document.getElementById("form-pelapor-kantor") ? document.getElementById("form-pelapor-kantor").value.trim() : "";
    const pelaporJabatanVal = document.getElementById("form-pelapor-jabatan") ? document.getElementById("form-pelapor-jabatan").value.trim() : "";

    if (!pelaporNamaVal) {
      alert("Bagian I: Nama Petugas Penyelidik Epidemiologi (Pelapor) wajib diisi (misal: JOKO WALUYO, S.Kep).");
      if (document.getElementById("form-pelapor-nama")) document.getElementById("form-pelapor-nama").focus();
      return;
    }
    if (!pelaporKantorVal) {
      alert("Bagian I: Nama Kantor / Faskes Pelapor wajib diisi (misal: Puskesmas Kebonagung / Dinkes Kab. Sidoarjo).");
      if (document.getElementById("form-pelapor-kantor")) document.getElementById("form-pelapor-kantor").focus();
      return;
    }

    // 2. Validasi No. EPID (Identitas Utama Baku Kemenkes: Wajib Format Angka D-xxxxxxxx)
    let rawNoEpid = document.getElementById("form-no-epid") ? document.getElementById("form-no-epid").value.trim() : "";
    rawNoEpid = rawNoEpid.replace(/^D\s*-\s*/i, "");
    if (!rawNoEpid) {
      rawNoEpid = window.SIDIF_FORMS.generateNoEpid(user.region, null, null, "digits");
    }
    const noEpidVal = "D-" + rawNoEpid;

    // 3. NIK Bersifat Opsional (Hanya divalidasi panjang jika diisi)
    const hasNoNik = document.getElementById("form-no-nik-chk") ? document.getElementById("form-no-nik-chk").checked : false;
    let nikVal = document.getElementById("form-nik") ? document.getElementById("form-nik").value.trim() : "";
    if (nikVal && nikVal.length !== 16 && !hasNoNik) {
      alert("Nomor Induk Kependudukan (NIK) jika diisi harus 16 digit angka. Atau kosongkan jika belum memiliki NIK.");
      document.getElementById("form-nik").focus();
      return;
    }

    const namaVal = document.getElementById("form-nama").value.trim();
    const namaIbuVal = document.getElementById("form-nama-ibu").value.trim();
    const tglLahirVal = document.getElementById("form-tgl-lahir").value;
    const tglOnsetVal = document.getElementById("form-tgl-onset").value;
    const kecVal = document.getElementById("form-kecamatan").value;

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

    // Sumber Laporan Faskes
    let sumberLaporanVal = document.getElementById("form-pelapor-sumber") ? document.getElementById("form-pelapor-sumber").value : "Puskesmas";
    if (sumberLaporanVal === "Lainnya") {
      const customTxt = document.getElementById("form-sumber-lainnya-text") ? document.getElementById("form-sumber-lainnya-text").value.trim() : "";
      sumberLaporanVal = customTxt || "Lainnya";
    }

    // Field Tambahan Bagian II Sesuai DIF-1 Resmi
    const pekerjaanVal = document.getElementById("form-pekerjaan") ? document.getElementById("form-pekerjaan").value : "Belum Bekerja / Balita";
    const teleponVal = document.getElementById("form-telepon") ? document.getElementById("form-telepon").value.trim() : "";
    const tbVal = document.getElementById("form-tb") && document.getElementById("form-tb").value ? parseFloat(document.getElementById("form-tb").value) : null;
    const bbVal = document.getElementById("form-bb") && document.getElementById("form-bb").value ? parseFloat(document.getElementById("form-bb").value) : null;

    // Gejala Lain & Obat Lain
    const gejalaLainVal = document.getElementById("form-gejala-lain") ? document.getElementById("form-gejala-lain").value.trim() : "";
    const obatLainVal = document.getElementById("form-obat-lain") ? document.getElementById("form-obat-lain").value.trim() : "";

    // Bagian VII: Riwayat Kontak & Bepergian 14 Hari Sebelum Sakit
    const pernahKontakVal = document.getElementById("form-pernah-kontak-difteri") ? document.getElementById("form-pernah-kontak-difteri").value : "Tidak";
    const kontakKasusNamaVal = document.getElementById("form-kontak-kasus-nama") ? document.getElementById("form-kontak-kasus-nama").value.trim() : "";
    const kontakKasusHubunganVal = document.getElementById("form-kontak-kasus-hubungan") ? document.getElementById("form-kontak-kasus-hubungan").value.trim() : "";
    const kontakKasusTglVal = document.getElementById("form-kontak-kasus-tgl") ? document.getElementById("form-kontak-kasus-tgl").value : "";

    const pernahBepergianVal = document.getElementById("form-pernah-bepergian-klb") ? document.getElementById("form-pernah-bepergian-klb").value : "Tidak";
    const travelDaerahVal = document.getElementById("form-travel-daerah") ? document.getElementById("form-travel-daerah").value.trim() : "";
    const travelTglVal = document.getElementById("form-travel-tgl") ? document.getElementById("form-travel-tgl").value : "";

    const genderVal = document.getElementById("gender-radio-male").checked ? "L" : "P";
    const dptVal = document.getElementById("form-dpt").value;
    const dtVal = document.getElementById("form-dt").value;
    const tdVal = document.getElementById("form-td").value;
    const ageObj = window.SIDIF_FORMS.calculateAge(tglLahirVal, tglOnsetVal);
    const dosesObj = window.SIDIF_FORMS.calculateDoses(dptVal, dtVal, tdVal, ageObj.years, ageObj.months);
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

    // Validasi Antibiotik & Tanggal Mulai
    let antibiotikVal = document.getElementById("form-antibiotik") ? document.getElementById("form-antibiotik").value : "Eritromisin";
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

    // Validasi Keadaan Akhir & Tanggal Sembuh / Meninggal
    const keadaanVal = document.getElementById("form-keadaan") ? document.getElementById("form-keadaan").value : "Hidup / Sembuh";
    const tglSembuhVal = document.getElementById("form-tgl-sembuh") ? document.getElementById("form-tgl-sembuh").value : "";
    const tglMeninggalVal = document.getElementById("form-tgl-meninggal") ? document.getElementById("form-tgl-meninggal").value : "";

    if (keadaanVal === "Hidup / Sembuh" && !tglSembuhVal) {
      alert("Bagian VI: Tanggal pasien sembuh wajib diisi bila keadaan akhir adalah 'Hidup / Sembuh'.");
      if (document.getElementById("form-tgl-sembuh")) document.getElementById("form-tgl-sembuh").focus();
      return;
    }
    if (keadaanVal === "Meninggal Dunia" && !tglMeninggalVal) {
      alert("Bagian VI: Tanggal pasien meninggal wajib diisi bila keadaan akhir adalah 'Meninggal Dunia'.");
      if (document.getElementById("form-tgl-meninggal")) document.getElementById("form-tgl-meninggal").focus();
      return;
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

    // Klasifikasi Sesuai Baku Kemenkes (Hubungan Epidemiologi Masuk Pertimbangan Utama)
    const classObj = window.SIDIF_FORMS.calculateClassification({
      hasilKulturHidung: hasilKulturH,
      hasilKulturTenggorok: hasilKulturT,
      tanggalAmbilHidung: tglAmbilHidung,
      tanggalAmbilTenggorok: tglAmbilTenggorok,
      hasilKultur: hasilKulturOverall,
      hubunganEpidemiologi: kontakEpiVal
    });

    // Kumpulkan & Validasi Kontak Erat Dinamis (Bagian VIII - WAJIB DIISI)
    const contactRows = document.querySelectorAll("#contacts-entry-table-body tr.contact-data-row");
    if (!contactRows || contactRows.length === 0) {
      alert("BAGIAN VIII WAJIB: Daftar Kontak Erat & Profilaksis harus diisi minimal 1 orang kontak erat.");
      return;
    }

    const kontakList = [];
    for (let i = 0; i < contactRows.length; i++) {
      const tr = contactRows[i];
      const nama = tr.querySelector(".contact-nama")?.value.trim() || "";
      const umur = tr.querySelector(".contact-umur")?.value.trim() || "";
      const hubungan = tr.querySelector(".contact-hubungan")?.value || "";
      const gejala = tr.querySelector(".contact-gejala")?.value || "Tidak Ada";
      const imunisasi = tr.querySelector(".contact-imunisasi")?.value || "Lengkap";
      const profilaksis = tr.querySelector(".contact-profilaksis")?.value || "Ya";

      if (!nama) {
        alert(`BAGIAN VIII WAJIB ISI: Nama kontak erat pada baris ke-${i + 1} belum diisi.`);
        tr.querySelector(".contact-nama")?.focus();
        return;
      }
      if (!hubungan) {
        alert(`BAGIAN VIII WAJIB ISI: Hubungan / Lingkungan kontak erat pada baris ke-${i + 1} wajib dipilih.`);
        tr.querySelector(".contact-hubungan")?.focus();
        return;
      }
      kontakList.push({ nama, umur, hubungan, gejala, imunisasi, profilaksis });
    }

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
      pelaporNama: pelaporNamaVal,
      pelaporNip: pelaporNipVal,
      pelaporKantor: pelaporKantorVal,
      pelaporJabatan: pelaporJabatanVal,
      nama: namaVal,
      namaIbu: namaIbuVal,
      tanggalLahir: tglLahirVal,
      umurTahun: ageObj.years,
      umurBulan: ageObj.months,
      jenisKelamin: genderVal,
      pekerjaan: pekerjaanVal,
      telepon: teleponVal,
      tinggiBadan: tbVal,
      beratBadan: bbVal,
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
      gejalaLain: gejalaLainVal,
      lokasiPseudomembran: ["Tenggorok / Faring"],
      dpt: dptVal,
      dt: dtVal,
      td: tdVal,
      totalDosis: dosesObj.total,
      statusImunisasi: dosesObj.statusImunisasi,
      tanggalTerakhirVaksinasi: document.getElementById("form-tgl-terakhir-vax").value || "-",
      sumberImunisasi: document.getElementById("form-sumber-vax").value,
      sumberLaporan: sumberLaporanVal,
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
      antibiotik: antibiotikVal,
      tanggalAntibiotik: document.getElementById("form-tgl-antibiotik").value,
      obatLain: obatLainVal,
      adsDiberikan: adsVal,
      tanggalADS: tglAdsVal,
      adsDosis: parseInt(dosisAdsVal || "0", 10),
      keadaanAkhir: keadaanVal,
      tanggalSembuh: tglSembuhVal,
      tanggalMeninggal: tglMeninggalVal,
      pernahKontakDifteri: pernahKontakVal,
      kontakKasusNama: kontakKasusNamaVal,
      kontakKasusHubungan: kontakKasusHubunganVal,
      kontakKasusTgl: kontakKasusTglVal,
      pernahBepergianKlb: pernahBepergianVal,
      travelDaerah: travelDaerahVal,
      travelTgl: travelTglVal,
      kontakList: kontakList,
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

    this.resetFormFields();
    this.showView("table-data");
  },

  // Pembatalan Dokumen Penyelidikan Epidemiologi (VOID)
  voidCurrentCase() {
    const caseId = document.getElementById("form-case-id") ? document.getElementById("form-case-id").value : null;
    if (!caseId) {
      alert("Hanya kasus yang telah tersimpan di database yang dapat dibatalkan (VOID).\nUntuk formulir baru yang belum disimpan, gunakan tombol 'Bersihkan Formulir'.");
      return;
    }
    const c = window.SIDIF_STORE.getCaseById(caseId);
    if (!c) {
      alert("Data kasus tidak ditemukan.");
      return;
    }

    const confirmVoid = confirm(
      `PERINGATAN PEMBATALAN DOKUMEN EPIDEMIOLOGI (VOID):\n\n` +
      `Apakah Anda yakin ingin MEMBATALKAN (VOID) dokumen PE berikut?\n` +
      `• No. EPID: ${c.noEpid}\n` +
      `• Nama Pasien: ${c.nama} (${c.kabupaten})\n\n` +
      `KONSEKUENSI PENTING:\n` +
      `1. Nomor EPID ${c.noEpid} akan HANGUS dan TIDAK DAPAT digunakan kembali.\n` +
      `2. Dokumen tetap tersimpan dalam riwayat audit dengan status VOID dicoret merah.\n` +
      `3. Data kasus ini otomatis dikecualikan dari perhitungan dashboard surveilans aktif.\n\n` +
      `Ketik OK untuk melanjutkan pembatalan.`
    );
    if (!confirmVoid) return;

    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const username = user ? user.username : "Petugas";

    c.statusAdmin = "VOID";
    c.isVoid = true;
    c.statusDokumen = "VOID";
    c.voidAt = new Date().toISOString();
    c.voidBy = username;

    const saved = window.SIDIF_STORE.saveCase(c);
    if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
      window.SIDIF_CLOUD.syncCaseToCloud(saved);
    }
    window.SIDIF_STORE.logAudit(username, "VOID_CASE", `Membatalkan (VOID) dokumen kasus No. EPID ${c.noEpid}`);

    alert(`DOKUMEN DIBATALKAN:\nDokumen PE No. EPID ${c.noEpid} atas nama ${c.nama} telah resmi di-VOID dan dicoret.`);
    this.resetFormFields();
    this.renderTableData();
    this.applyDashboardFilters();
    this.showView("table-data");
  },

  // Notifikasi Real-time Audio Chime & Floating Toast
  triggerRealtimeNotification(newCase) {
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    if (!user) return; // Kunci Privasi: Jangan bunyikan alarm atau tampilkan notifikasi jika belum login

    const isKabupaten = (user.type === "kabupaten" || user.type === "kota" || user.role === "operator");

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
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const dropdown = document.getElementById("notification-dropdown");
    if (!dropdown) return;
    if (!user) {
      dropdown.classList.add("hidden");
      alert("Akses Terbatas: Kotak Notifikasi Surveilans hanya dapat diakses oleh petugas kesehatan yang telah masuk ke sistem.");
      return;
    }
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

    // Heartbeat setiap 15 detik untuk memperbarui status online
    if (this._presenceInterval) clearInterval(this._presenceInterval);
    this._presenceInterval = setInterval(() => {
      this.updateMyPresence();
    }, 15000);

    // Sinkronisasi Lintas Tab / Multi-Akun Instan via BroadcastChannel
    try {
      if (typeof window.BroadcastChannel !== "undefined") {
        this._chatBroadcastChannel = new BroadcastChannel("sidif_chat_presence_channel");
        this._chatBroadcastChannel.onmessage = (event) => {
          if (event.data?.type === "CHAT_UPDATE") {
            this.loadChatMessages();
            this.renderChatMessages();
          } else if (event.data?.type === "PRESENCE_UPDATE") {
            this.renderOnlinePresence();
          }
        };
      }
    } catch(e) {}

    // Sinkronisasi lintas Tab / Browser Window Fallback
    window.addEventListener("storage", (e) => {
      if (e.key === "sidif_active_presence_map") {
        this.renderOnlinePresence();
      }
      if (e.key === "sidif_live_chat_feed") {
        this.loadChatMessages();
        this.renderChatMessages();
      }
    });

    // Otomatis hapus status presence saat tab atau jendela ditutup
    window.addEventListener("beforeunload", () => {
      const u = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
      if (u) {
        this.removeOnlinePresence(u.username);
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
    // Bersihkan sesi yang tidak aktif lebih dari 3 menit
    const cleaned = {};
    Object.keys(map).forEach(k => {
      if (now - (map[k].lastPing || 0) < 3 * 60 * 1000) {
        cleaned[k] = map[k];
      }
    });

    if (user) {
      const myPresence = {
        username: user.username,
        name: `Petugas ${user.region.replace(/^Kabupaten\s+/i, "Kab. ").replace(/^Kota\s+/i, "Kota ")}`,
        region: user.region,
        role: user.type === "provinsi" ? "Provinsi" : "Kabupaten/Kota",
        status: actionText || (cleaned[user.username] ? cleaned[user.username].status : "Sedang Memantau Sistem"),
        lastPing: now
      };
      cleaned[user.username] = myPresence;

      // Sinkronkan ke Google Cloud Firestore agar laptop lain seketika tahu
      if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
        window.SIDIF_CLOUD.syncPresenceToCloud(myPresence);
      }
    }

    localStorage.setItem("sidif_active_presence_map", JSON.stringify(cleaned));
    this.renderOnlinePresence();

    try {
      if (this._chatBroadcastChannel) {
        this._chatBroadcastChannel.postMessage({ type: "PRESENCE_UPDATE" });
      }
    } catch(e) {}
  },

  // Perbarui presence dari Cloud Firestore (Multi-Laptop / Lintas Perangkat)
  updateCloudPresenceMap(cloudMap) {
    if (!cloudMap) return;
    let localMap = {};
    try {
      localMap = JSON.parse(localStorage.getItem("sidif_active_presence_map") || "{}");
    } catch(e) { localMap = {}; }

    const now = Date.now();
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;

    const merged = {};
    // Masukkan data lokal aktif (< 3 menit)
    Object.keys(localMap).forEach(k => {
      if (now - (localMap[k].lastPing || 0) < 3 * 60 * 1000) {
        merged[k] = localMap[k];
      }
    });

    // Masukkan data cloud aktif (< 3 menit)
    Object.keys(cloudMap).forEach(k => {
      if (now - (cloudMap[k].lastPing || 0) < 3 * 60 * 1000) {
        merged[k] = cloudMap[k];
      }
    });

    // Pertahankan presence diri sendiri jika aktif
    if (user && merged[user.username]) {
      merged[user.username].lastPing = now;
    }

    localStorage.setItem("sidif_active_presence_map", JSON.stringify(merged));
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

    if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline && username) {
      window.SIDIF_CLOUD.removePresenceFromCloud(username);
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
    const activeList = Object.values(map).filter(o => now - (o.lastPing || 0) < 3 * 60 * 1000);

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
      if (this._chatBroadcastChannel) {
        this._chatBroadcastChannel.postMessage({ type: "CHAT_UPDATE" });
      }
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
    const currentUsername = currentUser ? currentUser.username : null;
    const isSuperAdmin = !currentUser || currentUser.role === "superadmin" || currentUser.type === "provinsi" || (currentUser.region && currentUser.region.toLowerCase().includes("provinsi"));
    const norm = (s) => (s || "").toLowerCase().replace(/^(kabupaten|kota)\s+/i, "").trim();
    const userNormRegion = currentUser && currentUser.region ? norm(currentUser.region) : "";

    // ISOLASI DATA PRIVASI KABUPATEN/KOTA PADA PERCAKAPAN CHAT
    // Data query kabupaten A tersembunyi dari kabupaten B, tapi tetap terlihat penuh oleh Provinsi
    const visibleMessages = this.chatMessages.filter(m => {
      // 1. Pesan selamat datang awal bot terlihat oleh semua
      if (m.id === "msg-welcome-bot") return true;

      // 2. Super Admin (Provinsi) memiliki wewenang penuh melihat seluruh percakapan dan respon data
      if (isSuperAdmin) return true;

      // 3. Pesan koordinasi umum non-data terbuka untuk komunikasi lintas kabupaten
      if (!m.isDataQuery) return true;

      // 4. Jika pesan berkaitan dengan data surveilans kasus:
      // Tampilkan jika dikirim oleh user sendiri atau ditujukan untuk user ini
      if (currentUsername && (m.senderUsername === currentUsername || m.replyToUser === currentUsername)) {
        return true;
      }

      // Tampilkan jika wilayah target atau wilayah pengirim sama dengan wilayah wewenang petugas
      const msgTargetNorm = norm(m.targetRegion);
      const msgSenderNorm = norm(m.senderRegion || m.region);

      if (userNormRegion && (msgTargetNorm === userNormRegion || msgSenderNorm === userNormRegion)) {
        return true;
      }

      // Sembunyikan data daerah lain (misal Sidoarjo & Malang tidak dapat melihat query data Surabaya)
      return false;
    });

    feed.innerHTML = visibleMessages.map(m => {
      const isBot = !!m.isBot;
      const isMe = !isBot && currentUsername && (m.senderUsername === currentUsername || (m.sender && m.sender.startsWith(currentUsername)));

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
    const role = user ? (user.role === "superadmin" || user.type === "provinsi" ? "PROVINSI" : "KAB/KOTA") : "OPERATOR";
    const region = user ? user.region : "Jawa Timur";
    const isDataQuery = this.isEpidemiologyQuery(textVal);

    const userMsg = {
      id: "msg-" + Date.now(),
      sender: `${sender} (${region})`,
      senderUsername: user ? user.username : "GUEST",
      role: role,
      region: region,
      text: textVal,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      timestamp: Date.now(),
      isBot: false,
      isDataQuery: isDataQuery,
      targetRegion: region,
      senderRegion: region
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
    if (isDataQuery) {
      setTimeout(() => {
        const botReply = this.generateEpidemiologyAnswer(textVal);
        this.chatMessages.push(botReply);
        this.saveChatMessages();
        this.renderChatMessages();
        this.playNotificationSound();

        // Selaraskan juga jawaban bot ke Cloud agar terlihat di laptop lawan bicara
        if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
          window.SIDIF_CLOUD.sendChatMessageToCloud(botReply);
        }
      }, 350);
    }
  },

  // Terima Pesan Real-Time dari Google Cloud Firestore (Lintas Laptop)
  receiveChatMessage(msg, isInitialSync = false) {
    if (!msg || !msg.text) return;
    if (!this.chatMessages) this.chatMessages = [];

    // Cek duplikasi berdasarkan ID atau (timestamp + sender)
    const exists = this.chatMessages.some(m => m.id === msg.id || (m.timestamp && m.timestamp === msg.timestamp && m.sender === msg.sender));
    if (exists) return;

    this.chatMessages.push(msg);
    this.chatMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    try {
      localStorage.setItem("sidif_live_chat_feed", JSON.stringify(this.chatMessages));
    } catch(e) {}

    this.renderChatMessages();

    // Notifikasi suara dan lencana unread jika bukan sinkronisasi awal dan bukan pesan dari diri sendiri
    if (!isInitialSync) {
      const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
      const currentUsername = currentUser ? currentUser.username : null;
      const isFromMe = currentUsername && (msg.senderUsername === currentUsername || (msg.sender && msg.sender.startsWith(currentUsername)));

      if (!isFromMe) {
        const box = document.getElementById("chat-box");
        const isDrawerOpen = box && !box.classList.contains("hidden");
        if (!isDrawerOpen) {
          const unreadEl = document.getElementById("chat-unread-badge");
          if (unreadEl) {
            const currentCount = parseInt(unreadEl.innerText || "0", 10) || 0;
            unreadEl.innerText = currentCount + 1;
            unreadEl.classList.remove("hidden");
          }
        }
        this.playNotificationSound();
      }
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

  // Mesin Penjawab Data Epidemiologi SIDIF (Context-Aware Sesuai Akun Wilayah yang Sedang Login)
  generateEpidemiologyAnswer(queryText) {
    const q = queryText.toLowerCase();
    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const isRegional = currentUser && (currentUser.type === "kabupaten" || currentUser.type === "kota" || currentUser.role === "operator") && currentUser.region && !currentUser.region.toLowerCase().includes("provinsi");
    const userRegion = isRegional ? currentUser.region : null;

    const allCases = window.SIDIF_STORE.getCases();
    const totalAllCases = allCases.length || 1;

    // Deteksi jika pengguna eksplisit bertanya tentang wilayah tertentu
    const regionalKeywords = [
      "sidoarjo", "gresik", "surabaya", "tuban", "bangkalan", "sampang", "sumenep",
      "malang", "pasuruan", "jember", "blitar", "kediri", "lamongan", "bojonegoro",
      "probolinggo", "nganjuk", "magetan", "banyuwangi", "bondowoso", "situbondo",
      "lumajang", "madiun", "ngawi", "ponorogo", "pacitan", "trenggalek", "tulungagung",
      "mojokerto", "jombang", "pamekasan", "batu"
    ];
    const specificRegMatch = regionalKeywords.find(reg => q.includes(reg));
    const asksJatimExplicit = q.includes("jatim") || q.includes("jawa timur") || q.includes("seluruh") || q.includes("provinsi") || q.includes("semua");

    const norm = (s) => (s || "").toLowerCase().replace(/^(kabupaten|kota)\s+/i, "").trim();

    // Tentukan wilayah acuan data (Default: Wilayah akun login jika ada, atau seluruh Jatim)
    let activeRegion = "Jawa Timur";
    let activeCases = allCases;
    if (specificRegMatch) {
      activeCases = allCases.filter(c => (c.kabupaten || "").toLowerCase().includes(specificRegMatch));
      activeRegion = activeCases[0]?.kabupaten || specificRegMatch.toUpperCase();
    } else if (isRegional && !asksJatimExplicit) {
      activeCases = allCases.filter(c => norm(c.kabupaten) === norm(userRegion));
      activeRegion = userRegion;
    }

    const totalCases = activeCases.length;
    let responseText = "";

    // 1. QUERY KHUSUS: STATUS IMUNISASI MENURUT UMUR (MISAL: DIBAWAH 1 TAHUN)
    if (q.includes("< 1") || q.includes("<1") || q.includes("dibawah 1") || q.includes("kurang dari 1") || q.includes("bayi") || q.includes("usia 0")) {
      const under1Active = activeCases.filter(c => (c.umurTahun || 0) < 1);
      const totalU1Active = under1Active.length;

      if (isRegional && !specificRegMatch && !asksJatimExplicit) {
        responseText = `📊 **DATA IMUNISASI DIFTERI USIA < 1 TH (BAYI): ${activeRegion.toUpperCase()}**\n\n` +
          `• **Wilayah Anda (${activeRegion}):** ${totalU1Active} kasus bayi < 1 tahun\n` +
          `• **Tidak Diimunisasi:** 0 kasus\n` +
          `• **Imunisasi Belum Lengkap:** 0 kasus\n` +
          `• **Imunisasi Lengkap:** 0 kasus\n\n` +
          `💡 **Konteks & Perbandingan:**\n` +
          `Pada periode M1–M43 tahun 2026, **tidak ditemukan kasus difteri pada bayi usia < 1 tahun**, baik di wilayah ${activeRegion} maupun di seluruh Jawa Timur (total 277 kasus). Kasus difteri di Jawa Timur paling tinggi menyerang usia **> 14 tahun (96 kasus / 34.7%)** dan usia **1–4 tahun (53 kasus / 19.1%)**.`;
      } else {
        responseText = `📊 **DATA IMUNISASI DIFTERI: KELOMPOK USIA < 1 TAHUN (BAYI)**\n\n` +
          `• **Wilayah Acuan:** ${activeRegion.toUpperCase()}\n` +
          `• **Total Kasus Difteri Usia < 1 Th:** ${totalU1Active} kasus (0%)\n` +
          `• **Tidak Diimunisasi:** 0 kasus (0%)\n` +
          `• **Imunisasi Belum Lengkap:** 0 kasus (0%)\n` +
          `• **Imunisasi Lengkap:** 0 kasus (0%)\n\n` +
          `💡 **Insight Epidemiologi (Slide 6 PPT Resmi):**\n` +
          `Pada periode M1–M43 tahun 2026, **tidak ditemukan kasus difteri pada bayi usia < 1 tahun** di Jawa Timur. Kasus difteri paling tinggi menyerang usia **> 14 tahun (96 kasus / 34.7%)** dan usia **1–4 tahun (53 kasus / 19.1%)**, di mana mayoritas penderita tidak memiliki riwayat imunisasi lengkap.`;
      }
    }
    else if (q.includes("1-4") || q.includes("1 - 4") || q.includes("balita")) {
      const g = activeCases.filter(c => c.umurTahun >= 1 && c.umurTahun <= 4);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if ((imm.includes("lengkap") && !imm.includes("belum")) || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      const pT = g.length > 0 ? Math.round((tidak / g.length) * 100) : 0;
      const pB = g.length > 0 ? Math.round((belum / g.length) * 100) : 0;
      const pL = g.length > 0 ? Math.max(0, 100 - pT - pB) : 0;

      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA 1 – 4 TAHUN (BALITA) - ${activeRegion.toUpperCase()}**\n\n` +
        `• **Total Kasus Balita 1–4 Th:** ${g.length} kasus (${totalCases > 0 ? ((g.length/totalCases)*100).toFixed(1) : 0}%)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus (${pT}%)\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus (${pB}%)\n` +
        `• **Imunisasi Lengkap (4 Dosis):** ${lengkap} kasus (${pL}%)\n\n` +
        `⚠️ Sesuai standar Kemenkes, balita 1–4 tahun wajib mendapat 4 dosis (3 dosis dasar DPT-HB-Hib + 1 dosis booster baduta usia 18 bulan) untuk dihitung lengkap. Segera optimalkan respon imunisasi (ORI).`;
    }
    else if (q.includes("5-9") || q.includes("5 - 9")) {
      const g = activeCases.filter(c => c.umurTahun >= 5 && c.umurTahun <= 9);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if ((imm.includes("lengkap") && !imm.includes("belum")) || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA 5 – 9 TAHUN - ${activeRegion.toUpperCase()}**\n\n` +
        `• **Total Kasus Usia 5–9 Th:** ${g.length} kasus\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus`;
    }
    else if (q.includes("> 14") || q.includes(">14") || q.includes("diatas 14") || q.includes("dewasa")) {
      const g = activeCases.filter(c => c.umurTahun > 14);
      let tidak = 0, belum = 0, lengkap = 0;
      g.forEach(c => {
        const imm = (c.statusImunisasi || "").toLowerCase();
        if (imm.includes("tidak") || c.totalDosis === 0) tidak++;
        else if ((imm.includes("lengkap") && !imm.includes("belum")) || c.totalDosis >= 4) lengkap++;
        else belum++;
      });
      responseText = `📊 **DATA IMUNISASI DIFTERI: USIA > 14 TAHUN (TERTINGGI) - ${activeRegion.toUpperCase()}**\n\n` +
        `• **Total Kasus Usia > 14 Th:** ${g.length} kasus (${totalCases > 0 ? ((g.length/totalCases)*100).toFixed(1) : 0}%)\n` +
        `• **Tidak Diimunisasi:** ${tidak} kasus\n` +
        `• **Imunisasi Belum Lengkap:** ${belum} kasus\n` +
        `• **Imunisasi Lengkap:** ${lengkap} kasus\n\n` +
        `💡 Fenomena immunity gap pada usia remaja/dewasa diakibatkan menurunnya antibodi pasca imunisasi masa anak.`;
    }
    // 2. QUERY POSITIVITY RATE & KONFIRMASI LAB
    else if (q.includes("lab") || q.includes("kultur") || q.includes("positif") || q.includes("positivity rate") || q.includes("pr")) {
      const pos = activeCases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
      const klinis = activeCases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis" || c.klasifikasiKlinis === "Difteri Kompatibel Klinis").length;
      
      const labExam = activeCases.filter(c => c.hasilKultur === "Positif" || c.hasilKultur === "Negatif" || (c.statusLab && c.statusLab !== "-") || (c.tanggalAmbilHidung && c.tanggalAmbilHidung !== "-") || (c.tanggalAmbilTenggorok && c.tanggalAmbilTenggorok !== "-")).length;
      const totalLab = Math.max(labExam, pos);
      const pr = totalLab > 0 ? ((pos / totalLab) * 100).toFixed(1) : "0.0";

      responseText = `🔬 **HASIL UJI LABORATORIUM & POSITIVITY RATE: ${activeRegion.toUpperCase()}**\n\n` +
        `• **Positivity Rate (PR):** ${pr}% (${pos} Positif Lab dari ${totalLab} Spesimen Diperiksa)\n` +
        `• **Konfirmasi Lab Positif:** ${pos} kasus ${pos > 0 ? '(⚠️ Penetapan Status KLB)' : ''}\n` +
        `• **Kompatibel Klinis:** ${klinis} kasus\n` +
        `• **Spesimen Usap Diperiksa Lab:** ${totalLab} spesimen\n\n` +
        `*(Catatan Baku Kemenkes: Positivity Rate dihitung dari jumlah spesimen positif dibagi jumlah spesimen yang diperiksa lab, bukan dari total kasus).*`;
    }
    // 3. QUERY KEMATIAN / CFR
    else if (q.includes("kematian") || q.includes("meninggal") || q.includes("mati") || q.includes("cfr") || q.includes("fatality")) {
      const dead = activeCases.filter(c => (c.keadaanAkhir || "").toLowerCase().includes("meninggal"));
      const cfr = totalCases > 0 ? ((dead.length / totalCases) * 100).toFixed(1) : "0.0";
      responseText = `⚠️ **ANGKA KEMATIAN (CFR) DIFTERI: ${activeRegion.toUpperCase()}**\n\n` +
        `• **Case Fatality Rate (CFR):** ${cfr}% (${dead.length} Kematian dari ${totalCases} Kasus)\n` +
        `• **Pasien Hidup / Sembuh:** ${totalCases - dead.length} orang\n\n` +
        (activeRegion === "Jawa Timur" ? `Sebaran Kematian Jawa Timur: Tuban (2 kasus), Gresik (1 kasus), Sumenep (1 kasus).` : `Data untuk wilayah ${activeRegion}.`);
    }
    // 4. QUERY ADS (ANTI DIPHTHERIA SERUM)
    else if (q.includes("ads") || q.includes("serum") || q.includes("antitoksin")) {
      const ads = activeCases.filter(c => c.adsDiberikan).length;
      const adsPct = totalCases > 0 ? ((ads / totalCases) * 100).toFixed(1) : "0.0";
      responseText = `💉 **TATALAKSANA ANTI DIPHTHERIA SERUM (ADS): ${activeRegion.toUpperCase()}**\n\n` +
        `• **Kasus Diberi Terapi ADS:** ${ads} kasus (${adsPct}% dari total ${totalCases} kasus)\n` +
        `• **Rekomendasi Dosis:** 20.000 s/d 80.000 IU sesuai tingkat keparahan pseudomembran\n\n` +
        `*(Sesuai indikator surveilans, cakupan ADS dihitung dari total seluruh kasus).*`;
    }
    // 5. QUERY KONTAK ERAT
    else if (q.includes("kontak") || q.includes("serumah") || q.includes("profilaksis")) {
      let kr = 0, profKr = 0;
      activeCases.forEach(c => {
        kr += (c.kontakRumah || c.kontakEratRumah || 0);
        profKr += (c.profilaksisRumah || c.kontakEratProfilaksis || 0);
      });
      responseText = `👥 **MANAJEMEN KONTAK ERAT & PROFILAKSIS: ${activeRegion.toUpperCase()}**\n\n` +
        `• **Kontak Erat Serumah Terlacak:** ${kr} orang\n` +
        `• **Mendapat Profilaksis Eritromisin:** ${profKr} orang (${kr > 0 ? ((profKr/kr)*100).toFixed(1) : 0}%)\n\n` +
        `Kontak erat wajib diberikan kemoprofilaksis Eritromisin oral selama 7–14 hari dan dipantau harian.`;
    }
    // 6. DEFAULT / RINGKASAN WILAYAH
    else {
      const pos = activeCases.filter(c => c.hasilKultur === "Positif" || (c.klasifikasiKlinis && c.klasifikasiKlinis.includes("Konfirmasi"))).length;
      const klin = activeCases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis" || c.klasifikasiKlinis === "Difteri Kompatibel Klinis").length;
      const dead = activeCases.filter(c => (c.keadaanAkhir || "").toLowerCase().includes("meninggal")).length;
      const ads = activeCases.filter(c => c.adsDiberikan).length;

      if (isRegional && !specificRegMatch && !asksJatimExplicit) {
        responseText = `📋 **RINGKASAN DATA SURVEILANS WILAYAH ANDA: ${activeRegion.toUpperCase()}**\n\n` +
          `• **Total Kasus Terlacak:** ${activeCases.length} kasus\n` +
          `• **Konfirmasi Lab Positif:** ${pos} kasus ${pos > 0 ? '(⚠️ Status KLB Wilayah)' : ''}\n` +
          `• **Kompatibel Klinis:** ${klin} kasus\n` +
          `• **Mendapat Terapi ADS:** ${ads} kasus (${activeCases.length > 0 ? ((ads/activeCases.length)*100).toFixed(1) : 0}%)\n` +
          `• **Kasus Meninggal (CFR):** ${dead} kasus\n\n` +
          `🌐 **Perbandingan Provinsi Jawa Timur:**\n` +
          `Total Kasus Jatim: 277 kasus | Konfirmasi Lab: 17 kasus | Kematian: 4 kasus (CFR 1.4%).`;
      } else {
        responseText = `📋 **RINGKASAN SURVEILANS DIFTERI: ${activeRegion.toUpperCase()} (M1–M43 TAHUN 2026)**\n\n` +
          `• **Total Kasus Terdata:** ${activeCases.length} kasus\n` +
          `• **Konfirmasi Lab Positif:** ${pos} kasus\n` +
          `• **Kompatibel Klinis:** ${klin} kasus\n` +
          `• **Mendapat Terapi ADS:** ${ads} kasus (${activeCases.length > 0 ? ((ads/activeCases.length)*100).toFixed(1) : 0}%)\n` +
          `• **Kasus Meninggal:** ${dead} orang\n\n` +
          `Ketik pertanyaan seperti:\n` +
          `• \"jumlah imunisasi dibawah 1th berapa?\"\n` +
          `• \"berapa kasus konfirmasi lab?\"\n` +
          `• \"berapa angka kematian atau CFR?\"`;
      }
    }

    return {
      id: "msg-bot-" + Date.now(),
      sender: "Asisten SIDIF (Data AI)",
      role: "ASISTEN AI",
      region: isRegional ? userRegion : "Jawa Timur",
      text: responseText,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      timestamp: Date.now(),
      isBot: true,
      isDataQuery: true,
      targetRegion: activeRegion || (isRegional ? userRegion : "Jawa Timur"),
      senderRegion: isRegional ? userRegion : "Jawa Timur",
      replyToUser: currentUser ? currentUser.username : null
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

  // Pengendali Rahasia Bukti Otentik Asal Sistem (Secret Easter Egg Trigger)
  _secretClickCount: 0,
  _secretClickTimer: null,

  handleSecretTrigger() {
    this._secretClickCount = (this._secretClickCount || 0) + 1;
    if (this._secretClickTimer) clearTimeout(this._secretClickTimer);
    this._secretClickTimer = setTimeout(() => {
      this._secretClickCount = 0;
    }, 2500);

    if (this._secretClickCount >= 5) {
      this._secretClickCount = 0;
      this.openSecretAuthorshipModal();
    }
  },

  openSecretAuthorshipModal() {
    const modal = document.getElementById("modal-secret-authorship");
    if (modal) {
      modal.classList.remove("hidden");
    }
  },

  setupEventListeners() {
    // Tombol Kombinasi Rahasia Bukti Otentik (Ctrl + Alt + Shift + S)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key && e.key.toLowerCase() === "s") {
        this.openSecretAuthorshipModal();
      }
    });
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
