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
    this.renderNotifications();
    this.renderOnlinePresence();

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
    const regionSelectEl = document.getElementById("dashboard-region-select");
    const filterTahunEl = document.getElementById("filter-tahun");
    const filterBulanEl = document.getElementById("filter-bulan");

    const selectedRegion = regionSelectEl ? regionSelectEl.value : "Jawa Timur";
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
    const regionSelectEl = document.getElementById("dashboard-region-select");
    if (regionSelectEl) {
      regionSelectEl.value = displayName;
      this.applyDashboardFilters();
    }
  },

  // Reset Formulir dan Bersihkan Input (Tanpa Default 0)
  resetFormFields() {
    const form = document.getElementById("main-dif3-form");
    if (form) form.reset();

    document.getElementById("form-case-id").value = "";
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

    const filterRegionEl = document.getElementById("table-filter-region");
    const searchInputEl = document.getElementById("table-search-input");
    const pageSizeEl = document.getElementById("table-page-size");

    const selRegion = filterRegionEl ? filterRegionEl.value : "all";
    const query = searchInputEl ? searchInputEl.value.trim().toLowerCase() : "";
    const sizeVal = pageSizeEl ? pageSizeEl.value : "25";

    let cases = window.SIDIF_STORE.getCases();

    // Filter Wilayah
    if (selRegion !== "all") {
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
              <button onclick="window.SIDIF_EXPORT.viewFormPe('${c.id}')" class="px-3 py-1.5 bg-[#0F7A4F] hover:bg-[#15803D] text-white text-[11px] font-bold rounded shadow-xs flex items-center gap-1 mx-auto">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>Lihat Form PE</span>
              </button>
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

    let noEpidVal = document.getElementById("form-no-epid").value.trim();
    if (!noEpidVal) {
      const code = user.username.replace("SIDIF_", "");
      noEpidVal = `${code}/2026/M${weekVal.toString().padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
    }

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

    const varianVal = document.getElementById("form-varian").value;
    const toksikVal = document.getElementById("form-toksigenitas").value;
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
      kabupaten: document.getElementById("form-kabupaten").value,
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
  notifications: [
    {
      id: "notif-1",
      title: "Konfirmasi Lab Positif Kultur BBLKM",
      desc: "Kasus an. Sdr. R (Tuban) terkonfirmasi positif C. diphtheriae toksigenik.",
      time: "15 mnt lalu",
      region: "Kabupaten Tuban",
      read: false,
      badge: "Difteri Konfirmasi Lab",
      badgeColor: "bg-red-100 text-red-800"
    },
    {
      id: "notif-2",
      title: "Laporan Kasus Difteri Baru",
      desc: "Dinkes Kab. Bangkalan melaporkan 1 kasus anak usia 7 th dengan pseudomembran.",
      time: "40 mnt lalu",
      region: "Kabupaten Bangkalan",
      read: false,
      badge: "Pending",
      badgeColor: "bg-blue-100 text-blue-800"
    },
    {
      id: "notif-3",
      title: "Peringatan Respon PE Segera",
      desc: "Kasus suspek di Kab. Sampang memerlukan penyelesaian formulir PE < 24 jam.",
      time: "1 jam lalu",
      region: "Kabupaten Sampang",
      read: true,
      badge: "Kompatibel Klinis",
      badgeColor: "bg-amber-100 text-amber-800"
    }
  ],

  onlineOfficers: [
    { name: "Super Admin Surveilans", region: "Dinas Kesehatan Provinsi Jatim", role: "Provinsi", status: "Sedang Memantau Dashboard & Kurva Epi", time: "Aktif Baru Saja" },
    { name: "dr. Sulvy Dwi Anggraini, M.Kes", region: "Kabid P2P Dinkes Prov. Jatim", role: "Provinsi", status: "Sedang Memeriksa Validasi Lab", time: "Aktif Baru Saja" },
    { name: "Petugas Surveilans Bangkalan", region: "Kabupaten Bangkalan", role: "Kabupaten", status: "Sedang Input Form DIF-3", time: "Aktif 2 mnt lalu" },
    { name: "Petugas Surveilans Tuban", region: "Kabupaten Tuban", role: "Kabupaten", status: "Sedang Cetak Lembar Form PE", time: "Aktif 5 mnt lalu" },
    { name: "Petugas Surveilans Gresik", region: "Kabupaten Gresik", role: "Kabupaten", status: "Sedang Pelacakan Kontak Erat", time: "Aktif 8 mnt lalu" },
    { name: "Petugas Surveilans Sampang", region: "Kabupaten Sampang", role: "Kabupaten", status: "Sedang Pengambilan Spesimen BBLKM", time: "Aktif 10 mnt lalu" },
    { name: "Petugas Surveilans Sumenep", region: "Kabupaten Sumenep", role: "Kabupaten", status: "Online", time: "Aktif 12 mnt lalu" },
    { name: "Petugas Surveilans Pamekasan", region: "Kabupaten Pamekasan", role: "Kabupaten", status: "Online", time: "Aktif 15 mnt lalu" },
    { name: "Petugas Surveilans Sidoarjo", region: "Kabupaten Sidoarjo", role: "Kabupaten", status: "Sedang Ekspor Rekap Excel", time: "Aktif 18 mnt lalu" },
    { name: "Petugas Surveilans Surabaya", region: "Kota Surabaya", role: "Kota", status: "Online", time: "Aktif 20 mnt lalu" },
    { name: "Petugas Surveilans Pasuruan", region: "Kabupaten Pasuruan", role: "Kabupaten", status: "Online", time: "Aktif 22 mnt lalu" },
    { name: "Petugas Surveilans Malang", region: "Kabupaten Malang", role: "Kabupaten", status: "Online", time: "Aktif 25 mnt lalu" },
    { name: "Petugas Surveilans Jember", region: "Kabupaten Jember", role: "Kabupaten", status: "Online", time: "Aktif 28 mnt lalu" },
    { name: "Petugas Surveilans Banyuwangi", region: "Kabupaten Banyuwangi", role: "Kabupaten", status: "Online", time: "Aktif 30 mnt lalu" }
  ],

  chatMessages: [
    {
      id: "msg-1",
      sender: "Dinkes Provinsi (P2P)",
      role: "PROVINSI",
      region: "Jawa Timur",
      text: "Selamat bertugas rekan-rekan 38 Kab/Kota. Mohon setiap penemuan kasus klinis difteri langsung dilakukan isolasi, penyelidikan kontak serumah, dan pengambilan spesimen usap sebelum antibiotik diberikan.",
      time: "08:15 WIB"
    },
    {
      id: "msg-2",
      sender: "Surveilans Tuban",
      role: "KABUPATEN",
      region: "Kabupaten Tuban",
      text: "Siap Provinsi. Pasien konfirmasi lab kultur di Tuban telah mendapatkan terapi ADS 40.000 IU dan kondisi klinis berangsur membaik. 8 kontak serumah telah tuntas profilaksis.",
      time: "08:35 WIB"
    },
    {
      id: "msg-3",
      sender: "Surveilans Bangkalan",
      role: "KABUPATEN",
      region: "Kabupaten Bangkalan",
      text: "Lapor Provinsi, 2 spesimen usap tenggorok kasus suspek baru DIF-BKL-009 pagi ini sudah dalam perjalanan kurir ke BBLKM Surabaya.",
      time: "09:00 WIB"
    }
  ],

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

    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (counterEl) {
      if (unreadCount > 0) {
        counterEl.innerText = unreadCount;
        counterEl.classList.remove("hidden");
      } else {
        counterEl.classList.add("hidden");
      }
    }

    if (this.notifications.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-slate-400">Tidak ada notifikasi baru saat ini.</div>';
      return;
    }

    container.innerHTML = this.notifications.map(n => `
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
    this.renderNotifications();
  },

  openNotificationItem(notifId) {
    const n = this.notifications.find(x => x.id === notifId);
    if (n) {
      n.read = true;
      this.renderNotifications();
      document.getElementById("notification-dropdown").classList.add("hidden");
      this.showView("table-data");
    }
  },

  // Handler Pemantauan Petugas Aktif (Online Presence)
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

    const count = this.onlineOfficers.length;
    if (countEl) countEl.innerText = `${count} Petugas Aktif`;
    if (headerCountEl) headerCountEl.innerText = `${count} Petugas Online`;

    listEl.innerHTML = this.onlineOfficers.map(o => `
      <div class="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full ${o.role === 'Provinsi' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white'} flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            ${o.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-slate-800 text-xs">${o.name}</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${o.role === 'Provinsi' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${o.role}</span>
            </div>
            <p class="text-[11px] text-slate-500">${o.region} &bull; <span class="text-emerald-700 font-semibold">${o.status}</span></p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-right shrink-0">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="text-[10px] text-emerald-800 font-bold">${o.time}</span>
        </div>
      </div>
    `).join("");
  },

  // Handler Ruang Koordinasi & Live Chat Tim Difteri
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
      const isMe = m.sender.includes(myName) || m.isMe;
      return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
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

  sendChatMessage(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("chat-input-text");
    if (!input || !input.value.trim()) return;

    const textVal = input.value.trim();
    const user = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;
    const sender = user ? user.username : "Dinkes Provinsi";
    const role = user ? user.role.toUpperCase() : "PROVINSI";
    const region = user ? user.region : "Jawa Timur";

    const newMsg = {
      id: "msg-" + Date.now(),
      sender: `${sender} (${region})`,
      role: role,
      region: region,
      text: textVal,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      timestamp: Date.now(),
      isMe: true
    };

    this.chatMessages.push(newMsg);
    this.renderChatMessages();
    input.value = "";

    // Sinkronkan ke Cloud Firestore jika aktif
    if (window.SIDIF_CLOUD && window.SIDIF_CLOUD.isOnline) {
      window.SIDIF_CLOUD.sendChatMessageToCloud(newMsg);
    }
  },

  receiveChatMessage(newMsg) {
    if (!newMsg || !newMsg.id) return;
    if (this.chatMessages.some(m => m.id === newMsg.id)) return;

    this.chatMessages.push(newMsg);
    const box = document.getElementById("chat-box");
    if (box && !box.classList.contains("hidden")) {
      this.renderChatMessages();
    } else {
      const badge = document.getElementById("chat-unread-badge");
      if (badge) {
        let count = parseInt(badge.innerText || "0", 10) + 1;
        badge.innerText = count;
        badge.classList.remove("hidden");
      }
    }

    // Suara notifikasi
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
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
