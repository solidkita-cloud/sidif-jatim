/**
 * SIDIF JAWA TIMUR - 2D INTERACTIVE LEAFLET MAP CONTROLLER
 * Menampilkan 38 Kabupaten/Kota dengan data agregat kasus difteri & cakupan imunisasi DPT-HB-Hib
 * Menggunakan Tile Esri World Light Gray Canvas (100% Bebas API Key)
 */

window.SIDIF_MAP = {
  mapInstance: null,
  geoJsonLayer: null,
  regionsData: {},
  selectedLayer: null,

  async init(containerId = "map-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    // Koordinat Pusat Jawa Timur [-7.75, 112.5]
    this.mapInstance = L.map(containerId, {
      center: [-7.75, 112.5],
      zoom: 8,
      minZoom: 7,
      maxZoom: 12,
      scrollWheelZoom: true
    });

    // Tile basemap minimalis bersih (Esri World Light Gray Canvas - 100% Bebas API Key)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    }).addTo(this.mapInstance);

    // Muat data wilayah dan GeoJSON
    await this.loadMapData();
  },

  async loadMapData() {
    try {
      // 1. Ambil data agregat wilayah
      const respData = await fetch("data/data-wilayah.json");
      const jsonWilayah = await respData.json();
      
      this.regionsData = {};
      this.rawMeta = jsonWilayah.meta;
      jsonWilayah.wilayah.forEach(w => {
        this.regionsData[w.nama.toLowerCase()] = w;
      });

      // 2. Ambil berkas GeoJSON batas 38 Kab/Kota Jawa Timur
      const respGeo = await fetch("data/jatim-kabkota.geojson");
      const geoJsonData = await respGeo.json();

      const self = this;
      this.geoJsonLayer = L.geoJSON(geoJsonData, {
        style: function(feature) {
          return self.getFeatureStyle(feature);
        },
        onEachFeature: function(feature, layer) {
          self.bindFeatureEvents(feature, layer);
        }
      }).addTo(this.mapInstance);

      // Default kartu samping: Ringkasan Jawa Timur & perbarui legenda
      this.showProvinceSummaryCard();
      this.updateLegendCounts();

    } catch (err) {
      console.error("Gagal memuat peta Jawa Timur:", err);
    }
  },

  // Helper Perhitungan Metrik 4 Indikator Baku per Wilayah / Jawa Timur
  getRegionMetrics(regionName) {
    const allCases = window.SIDIF_STORE ? window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" }) : [];
    const cleanTarget = (regionName || "").replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").trim().toLowerCase();
    
    if (!regionName || cleanTarget === "all" || cleanTarget === "jawa timur" || cleanTarget === "seluruh jawa timur" || cleanTarget === "provinsi jawa timur") {
      const kasus = allCases.length;
      const positif = allCases.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
      const ads = allCases.filter(c => c.adsDiberikan).length;
      const meninggal = allCases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
      return { kasus, positif, ads, meninggal };
    }

    const regional = allCases.filter(c => {
      const cKab = (c.kabupaten || "").replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "").trim().toLowerCase();
      return cKab === cleanTarget || cKab.includes(cleanTarget);
    });

    const kasus = regional.length;
    const positif = regional.filter(c => c.hasilKultur === "Positif" || c.klasifikasiKlinis === "Difteri Konfirmasi Lab" || c.klasifikasiKlinis === "Konfirmasi Lab" || c.klasifikasiKlinis === "Difteri Konfirmasi Hubungan Epidemiologi").length;
    const ads = regional.filter(c => c.adsDiberikan).length;
    const meninggal = regional.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    return { kasus, positif, ads, meninggal };
  },

  // Perbarui Angka dan Persentase pada Legenda Peta Depan
  updateLegendCounts() {
    let klbKabCount = 0;
    let klinisKabCount = 0;
    let bebasKabCount = 0;
    const totalKabKota = 38;

    Object.values(this.regionsData).forEach(w => {
      if ((w.kasusKonfirmasi || 0) > 0) {
        klbKabCount++;
      } else if ((w.kasusKlinis || 0) > 0 || (w.kasus || 0) > 0) {
        klinisKabCount++;
      } else {
        bebasKabCount++;
      }
    });

    const mProv = this.getRegionMetrics("Seluruh Jawa Timur");
    const fmt = (n) => (n || 0).toLocaleString("id-ID");

    const pKlb = ((klbKabCount / totalKabKota) * 100).toFixed(1).replace(".", ",");
    const pKlinis = ((klinisKabCount / totalKabKota) * 100).toFixed(1).replace(".", ",");
    const pBebas = ((bebasKabCount / totalKabKota) * 100).toFixed(1).replace(".", ",");

    const elTotal = document.getElementById("legend-total-kasus");
    const elKlb = document.getElementById("legend-klb-count");
    const elKlinis = document.getElementById("legend-klinis-count");
    const elBebas = document.getElementById("legend-bebas-count");

    if (elTotal) elTotal.innerText = fmt(mProv.kasus);
    if (elKlb) elKlb.innerText = `${fmt(klbKabCount)} Kab/Kota (${pKlb}%)`;
    if (elKlinis) elKlinis.innerText = `${fmt(klinisKabCount)} Kab/Kota (${pKlinis}%)`;
    if (elBebas) elBebas.innerText = `${fmt(bebasKabCount)} Kab/Kota (${pBebas}%)`;
  },

  // Tampilkan Kartu Ringkasan Seluruh Provinsi Jawa Timur
  showProvinceSummaryCard() {
    const dataProvinsi = this.getRegionMetrics("Seluruh Jawa Timur");
    window.SIDIF_APP.updateRegionDetailCard(dataProvinsi, "Seluruh Jawa Timur (Provinsi)");
  },

  // Fokus atau Zoom ke Wilayah Tertentu dari Dropdown
  focusRegion(regionName) {
    if (!this.geoJsonLayer || !this.mapInstance) return;

    if (!regionName || regionName === "all" || regionName === "Jawa Timur" || regionName === "Provinsi Jawa Timur") {
      this.mapInstance.setView([-7.75, 112.5], 8);
      if (this.selectedLayer) {
        this.geoJsonLayer.resetStyle(this.selectedLayer);
        this.selectedLayer = null;
      }
      this.showProvinceSummaryCard();
      return;
    }

    const cleanTarget = regionName.replace("Kabupaten ", "").replace("Kota ", "").trim().toLowerCase();
    let targetLayer = null;

    this.geoJsonLayer.eachLayer(layer => {
      const pName = (layer.feature.properties.cleanName || layer.feature.properties.name || "").toLowerCase();
      if (pName === cleanTarget || pName.includes(cleanTarget)) {
        targetLayer = layer;
      }
    });

    if (targetLayer) {
      if (this.selectedLayer) {
        this.geoJsonLayer.resetStyle(this.selectedLayer);
      }
      this.selectedLayer = targetLayer;
      targetLayer.setStyle({
        weight: 4,
        color: "#0F7A4F",
        fillOpacity: 0.95
      });
      targetLayer.bringToFront();

      this.mapInstance.fitBounds(targetLayer.getBounds(), {
        padding: [30, 30],
        maxZoom: 11
      });

      const displayName = targetLayer.feature.properties.displayName || targetLayer.feature.properties.name;
      const data = this.regionsData[cleanTarget] || { kasus: 0, dpt3: 0, targetBalita: 10000 };
      window.SIDIF_APP.updateRegionDetailCard(data, displayName);
    }
  },

  // Perbarui Warna Peta Saat Filter Tahun & Bulan Berubah
  applyFilter(year, month) {
    if (!this.geoJsonLayer) return;

    // Reset hitungan kasus pada setiap wilayah
    Object.keys(this.regionsData).forEach(key => {
      this.regionsData[key].kasus = 0;
      this.regionsData[key].kasusKonfirmasi = 0;
      this.regionsData[key].kasusKlinis = 0;
    });

    // Ambil kasus yang cocok dengan filter tahun & bulan
    const allCases = window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    const filtered = allCases.filter(c => {
      if (!c.tanggalOnset) return false;
      const d = new Date(c.tanggalOnset);
      const matchYear = (!year || year === "all") ? true : d.getFullYear().toString() === year.toString();
      const matchMonth = (!month || month === "all") ? true : (d.getMonth() + 1).toString() === month.toString();
      return matchYear && matchMonth;
    });

    // Hitung ulang per wilayah dari kasus terverifikasi
    filtered.forEach(c => {
      const cleanKab = c.kabupaten.replace("Kabupaten ", "").replace("Kota ", "").toLowerCase();
      if (this.regionsData[cleanKab]) {
        if (c.klasifikasiKlinis === "Konfirmasi Lab") {
          this.regionsData[cleanKab].kasusKonfirmasi = (this.regionsData[cleanKab].kasusKonfirmasi || 0) + 1;
        } else {
          this.regionsData[cleanKab].kasusKlinis = (this.regionsData[cleanKab].kasusKlinis || 0) + 1;
        }
        this.regionsData[cleanKab].kasus = this.regionsData[cleanKab].kasusKonfirmasi + this.regionsData[cleanKab].kasusKlinis;
      }
    });

    // Terapkan ulang style warna pada poligon peta
    const self = this;
    this.geoJsonLayer.eachLayer(function(layer) {
      const style = self.getFeatureStyle(layer.feature);
      layer.setStyle(style);
    });

    // Perbarui kartu detail wilayah yang aktif & angka legenda
    this.updateLegendCounts();
    if (this.selectedLayer) {
      const cleanName = (this.selectedLayer.feature.properties.cleanName || this.selectedLayer.feature.properties.name || "").toLowerCase();
      const displayName = this.selectedLayer.feature.properties.displayName || this.selectedLayer.feature.properties.name;
      const data = this.getRegionMetrics(displayName);
      window.SIDIF_APP.updateRegionDetailCard(data, displayName);
    }
  },

  // Logika Pewarnaan Sesuai Arahan Pimpinan & PRD:
  // Garis batas antar wilayah dibuat lebih tipis (weight: 1) dan putus-putus (dashArray: '3, 4')
  // 1. MERAH: Ada kasus konfirmasi kultur lab positif (KLB)
  // 2. SOFT PEACH/AMBER: Ada kasus klinis tapi lab negatif / pending
  // 3. PUTIH: Tidak ada kasus sama sekali (0 Kasus / Bebas Difteri)
  getFeatureStyle(feature) {
    const rawName = (feature.properties.name || feature.properties.cleanName || "").toLowerCase();
    const data = this.regionsData[rawName] || { kasus: 0, kasusKonfirmasi: 0, kasusKlinis: 0 };

    // A. Merah: Positif Kultur Lab (KLB)
    if (data.kasusKonfirmasi > 0) {
      return {
        fillColor: "#DC2626",
        weight: 1,
        dashArray: "3, 4",
        opacity: 0.9,
        color: "#7F1D1D",
        fillOpacity: 0.85
      };
    }

    // B. Warna Soft Warm Peach/Amber: Kompatibel Klinis
    if (data.kasusKlinis > 0 || data.kasus > 0) {
      return {
        fillColor: "#FED7AA",
        weight: 1,
        dashArray: "3, 4",
        opacity: 0.9,
        color: "#EA580C",
        fillOpacity: 0.85
      };
    }

    // C. Putih Bersih: Bebas Kasus (0 Kasus)
    return {
      fillColor: "#FFFFFF",
      weight: 1,
      dashArray: "3, 4",
      opacity: 0.85,
      color: "#94A3B8",
      fillOpacity: 0.9
    };
  },

  bindFeatureEvents(feature, layer) {
    const self = this;
    const displayName = feature.properties.displayName || feature.properties.name;
    const cleanName = (feature.properties.cleanName || feature.properties.name || "").toLowerCase();
    const fmt = (n) => (n || 0).toLocaleString("id-ID");

    // Tooltip Mengambang saat Hover
    const statsHover = self.getRegionMetrics(displayName);
    const tooltipText = `<strong>${displayName}</strong><br>Total Kasus: ${fmt(statsHover.kasus)} | Positif Lab: ${fmt(statsHover.positif)}`;
    layer.bindTooltip(tooltipText, { sticky: true, className: "text-xs font-sans" });

    // Event Hover & Click
    layer.on({
      mouseover: function(e) {
        const l = e.target;
        l.setStyle({
          weight: 2,
          color: "#0F7A4F",
          dashArray: "",
          fillOpacity: 0.95
        });
        l.bringToFront();
      },
      mouseout: function(e) {
        self.geoJsonLayer.resetStyle(e.target);
        if (self.selectedLayer) {
          self.selectedLayer.setStyle({ weight: 2.5, color: "#0F7A4F", dashArray: "" });
        }
      },
      click: function(e) {
        if (self.selectedLayer) {
          self.geoJsonLayer.resetStyle(self.selectedLayer);
        }
        self.selectedLayer = e.target;
        self.selectedLayer.setStyle({
          weight: 2.5,
          color: "#0F7A4F",
          dashArray: ""
        });

        // Ambil metrik real-time 4 indikator saat diklik
        const m = self.getRegionMetrics(displayName);

        // Munculkan popup Leaflet dengan 4 rincian wajib bertitik ribuan
        const popupHtml = `
          <div class="p-2.5 font-sans min-w-[210px] text-xs">
            <div class="border-b border-slate-200 pb-1.5 mb-2">
              <h4 class="font-black text-sm text-slate-800 leading-tight">${displayName}</h4>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${m.positif > 0 ? 'bg-red-100 text-red-700' : (m.kasus > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700')}">
                ${m.positif > 0 ? 'KLB Difteri (Konfirmasi Lab)' : (m.kasus > 0 ? 'Kompatibel Klinis' : 'Bebas Kasus (0 Kasus)')}
              </span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span class="text-slate-600 font-medium">Jumlah Kasus:</span>
                <strong class="text-slate-900 font-black">${fmt(m.kasus)}</strong>
              </div>
              <div class="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span class="text-slate-600 font-medium">Jumlah Positif:</span>
                <strong class="text-red-600 font-black">${fmt(m.positif)}</strong>
              </div>
              <div class="flex justify-between items-center py-0.5 border-b border-slate-100">
                <span class="text-slate-600 font-medium">Jumlah Penggunaan ADS:</span>
                <strong class="text-blue-700 font-black">${fmt(m.ads)}</strong>
              </div>
              <div class="flex justify-between items-center py-0.5">
                <span class="text-slate-600 font-medium">Jumlah Meninggal:</span>
                <strong class="text-slate-900 font-black">${fmt(m.meninggal)}</strong>
              </div>
            </div>
          </div>
        `;
        layer.bindPopup(popupHtml, { maxWidth: 280, closeButton: false, offset: [0, -5] }).openPopup();

        // Update Dropdown Wilayah & Filter Dashboard serta Kartu Rincian Samping
        if (window.SIDIF_APP && window.SIDIF_APP.onRegionSelectedFromMap) {
          window.SIDIF_APP.onRegionSelectedFromMap(displayName);
        } else {
          window.SIDIF_APP.updateRegionDetailCard(m, displayName);
        }
      }
    });
  }
};
