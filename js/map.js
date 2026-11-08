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

      // Default kartu samping: Ringkasan Jawa Timur
      this.showProvinceSummaryCard();

    } catch (err) {
      console.error("Gagal memuat peta Jawa Timur:", err);
    }
  },

  // Tampilkan Kartu Ringkasan Seluruh Provinsi Jawa Timur
  showProvinceSummaryCard() {
    const cases = window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    const totalKasus = cases.length;
    const konfirmasi = cases.filter(c => c.klasifikasiKlinis === "Konfirmasi Lab").length;
    const klinis = cases.filter(c => c.klasifikasiKlinis === "Kompatibel Klinis").length;
    const meninggal = cases.filter(c => c.keadaanAkhir === "Meninggal Dunia").length;
    const cfr = totalKasus > 0 ? ((meninggal / totalKasus) * 100).toFixed(1) : "0.0";

    const dataProvinsi = {
      kasus: totalKasus,
      kasusKonfirmasi: konfirmasi,
      kasusKlinis: klinis,
      dpt3: 3150000,
      targetBalita: 3400000,
      puskesmasLapor: 972,
      puskesmasTotal: 972,
      meninggal: meninggal,
      cfr: cfr
    };
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

    // Perbarui kartu detail wilayah yang aktif
    if (this.selectedLayer) {
      const cleanName = (this.selectedLayer.feature.properties.cleanName || this.selectedLayer.feature.properties.name || "").toLowerCase();
      const displayName = this.selectedLayer.feature.properties.displayName || this.selectedLayer.feature.properties.name;
      const data = this.regionsData[cleanName] || { kasus: 0, dpt3: 0, targetBalita: 10000 };
      window.SIDIF_APP.updateRegionDetailCard(data, displayName);
    }
  },

  // Logika Pewarnaan Sesuai PRD v2.0 & Slide PPT
  getFeatureStyle(feature) {
    const rawName = (feature.properties.name || feature.properties.cleanName || "").toLowerCase();
    const data = this.regionsData[rawName] || { kasus: 0, kasusKonfirmasi: 0, kasusKlinis: 0 };

    // A. Merah Solid: Ada Kasus Konfirmasi Lab (10 Kab/Kota KLB Sesuai Slide 4)
    if (data.kasusKonfirmasi > 0) {
      return {
        fillColor: "#DC2626",
        weight: 2,
        opacity: 1,
        color: "#991B1B",
        fillOpacity: 0.85
      };
    }

    // B. Merah Terang / Arsir: Ada Kasus Kompatibel Klinis (Menunggu Lab)
    if (data.kasusKlinis > 0 || data.kasus > 0) {
      return {
        fillColor: "#F87171",
        weight: 1.5,
        opacity: 1,
        color: "#DC2626",
        dashArray: "4, 4",
        fillOpacity: 0.75
      };
    }

    // C. Putih Bersih / Abu Halus: Bebas Kasus (0 Kasus)
    return {
      fillColor: "#FFFFFF",
      weight: 1.2,
      opacity: 1,
      color: "#94A3B8",
      fillOpacity: 0.7
    };
  },

  bindFeatureEvents(feature, layer) {
    const self = this;
    const displayName = feature.properties.displayName || feature.properties.name;
    const cleanName = (feature.properties.cleanName || feature.properties.name || "").toLowerCase();
    const data = self.regionsData[cleanName] || { kasus: 0, dpt3: 0, targetBalita: 10000 };

    // Tooltip Mengambang saat Hover
    const kasusCount = data.kasus || 0;
    const tooltipText = `<strong>${displayName}</strong><br>Total Kasus: ${kasusCount} | DPT3: ${Math.round((data.dpt3/data.targetBalita)*100)}%`;
    layer.bindTooltip(tooltipText, { sticky: true, className: "text-xs font-sans" });

    // Event Hover & Click
    layer.on({
      mouseover: function(e) {
        const l = e.target;
        l.setStyle({
          weight: 3,
          color: "#0F7A4F",
          fillOpacity: 0.95
        });
        l.bringToFront();
      },
      mouseout: function(e) {
        self.geoJsonLayer.resetStyle(e.target);
        if (self.selectedLayer) {
          self.selectedLayer.setStyle({ weight: 4, color: "#0F7A4F" });
        }
      },
      click: function(e) {
        if (self.selectedLayer) {
          self.geoJsonLayer.resetStyle(self.selectedLayer);
        }
        self.selectedLayer = e.target;
        self.selectedLayer.setStyle({
          weight: 4,
          color: "#0F7A4F"
        });

        // Update Dropdown Wilayah & Filter Dashboard
        if (window.SIDIF_APP && window.SIDIF_APP.onRegionSelectedFromMap) {
          window.SIDIF_APP.onRegionSelectedFromMap(displayName);
        } else {
          window.SIDIF_APP.updateRegionDetailCard(data, displayName);
        }
      }
    });
  }
};
