/**
 * SIDIF JAWA TIMUR - CHARTS & EPIDEMIOLOGICAL VISUALIZATIONS
 * Visualisasi Data Surveilans Difteri Berdasarkan Standar Presentasi Resmi
 * "Performa Surveilans Difteri di Jawa Timur M1-M43 Tahun 2026"
 * Sumber Data: SIDIPro_2026 Dinas Kesehatan Provinsi Jawa Timur
 */

window.SIDIF_CHARTS = {
  epiCurveChart: null,
  donutChart: null,
  ageChart: null,
  genderChart: null,

  init() {
    this.renderAllCharts();
  },

  renderAllCharts(filteredCases = null) {
    const cases = filteredCases || window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    this.renderEpiCurve(cases);
    this.renderAgeGroupChart(cases);
    this.renderDonutImunisasi(cases);
    this.renderGenderChart(cases);
    this.updateContactTracingNumbers(cases);
  },

  // 1. Kurva Epidemiologi Mingguan (Slide 9 & Chart 9: M1 - M43 dengan Puncak M23)
  renderEpiCurve(cases) {
    const ctx = document.getElementById("chart-epi-curve");
    if (!ctx) return;

    // Siapkan label M1 sampai M43
    const labels = [];
    const counts = new Array(43).fill(0);
    for (let i = 1; i <= 43; i++) {
      labels.push("M" + i);
    }

    // Hitung minggu epidemiologi dari cases
    cases.forEach(c => {
      let w = c.mingguEpid;
      if (!w && c.tanggalOnset) {
        const d = new Date(c.tanggalOnset);
        const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
        w = Math.min(43, Math.max(1, Math.ceil((dayOfYear + 1) / 7)));
      }
      if (w >= 1 && w <= 43) {
        counts[w - 1] += 1;
      }
    });

    if (this.epiCurveChart) {
      this.epiCurveChart.destroy();
    }

    this.epiCurveChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Jumlah Kasus Difteri",
          data: counts,
          backgroundColor: counts.map((cnt, idx) => {
            if (idx === 22) return "#B91C1C"; // Puncak M23 (Merah Gelap)
            return cnt > 0 ? "#DC2626" : "#E2E8F0";
          }),
          borderColor: counts.map((cnt, idx) => {
            if (idx === 22) return "#7F1D1D";
            return cnt > 0 ? "#991B1B" : "#CBD5E1";
          }),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => "Minggu Epidemiologi " + items[0].label + (items[0].label === "M23" ? " (Puncak Kasus)" : ""),
              label: (item) => `Kasus Terverifikasi: ${item.raw} Pasien`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2, precision: 0 },
            title: { display: true, text: "Jumlah Kasus", font: { size: 11, weight: "bold" } }
          },
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 22, font: { size: 10 } },
            title: { display: true, text: "Minggu Epidemiologi (Onset Sakit)", font: { size: 11, weight: "bold" } }
          }
        }
      }
    });
  },

  // 2. Grafik Distribusi Kelompok Usia (Slide 5 & Chart 1: <1 th, 1-4 th, 5-9 th, 10-14 th, >14 th)
  renderAgeGroupChart(cases) {
    const ctx = document.getElementById("chart-age-group");
    if (!ctx) return;

    let u_under1 = 0, u_1_4 = 0, u_5_9 = 0, u_10_14 = 0, u_over14 = 0;

    cases.forEach(c => {
      const thn = c.umurTahun !== undefined ? c.umurTahun : 0;
      if (thn < 1) u_under1++;
      else if (thn >= 1 && thn <= 4) u_1_4++;
      else if (thn >= 5 && thn <= 9) u_5_9++;
      else if (thn >= 10 && thn <= 14) u_10_14++;
      else u_over14++;
    });

    const total = cases.length || 1;
    const p_under1 = ((u_under1 / total) * 100).toFixed(1);
    const p_1_4 = ((u_1_4 / total) * 100).toFixed(1);
    const p_5_9 = ((u_5_9 / total) * 100).toFixed(1);
    const p_10_14 = ((u_10_14 / total) * 100).toFixed(1);
    const p_over14 = ((u_over14 / total) * 100).toFixed(1);

    if (this.ageChart) {
      this.ageChart.destroy();
    }

    this.ageChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["< 1 Tahun", "1 - 4 Tahun", "5 - 9 Tahun", "10 - 14 Tahun", "> 14 Tahun (Tertinggi)"],
        datasets: [{
          label: "Jumlah Kasus",
          data: [u_under1, u_1_4, u_5_9, u_10_14, u_over14],
          backgroundColor: ["#94A3B8", "#F59E0B", "#3B82F6", "#8B5CF6", "#DC2626"],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `${item.raw} Kasus (${[p_under1, p_1_4, p_5_9, p_10_14, p_over14][item.dataIndex]}%)`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 }
          },
          y: {
            ticks: { font: { size: 11, weight: "bold" } }
          }
        }
      }
    });
  },

  // 3. Donut Chart: Proporsi Riwayat Imunisasi (Slide 6 & Chart 3: 55% Tidak, 39% Belum, 6% Lengkap)
  renderDonutImunisasi(cases) {
    const ctx = document.getElementById("chart-donut-imunisasi");
    if (!ctx) return;

    let tidak = 0, belum = 0, lengkap = 0;

    cases.forEach(c => {
      const imm = c.statusImunisasi || "";
      if (imm.includes("Tidak diimunisasi") || c.totalDosis === 0) {
        tidak++;
      } else if (imm.includes("lengkap") && !imm.includes("belum")) {
        lengkap++;
      } else {
        belum++;
      }
    });

    const total = cases.length || 1;
    const pTidak = Math.round((tidak / total) * 100);
    const pBelum = Math.round((belum / total) * 100);
    const pLengkap = Math.round((lengkap / total) * 100);

    if (this.donutChart) {
      this.donutChart.destroy();
    }

    this.donutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          `Tidak Diimunisasi: ${tidak} (${pTidak}%)`,
          `Belum Lengkap: ${belum} (${pBelum}%)`,
          `Lengkap: ${lengkap} (${pLengkap}%)`
        ],
        datasets: [{
          data: [tidak, belum, lengkap],
          backgroundColor: ["#DC2626", "#F59E0B", "#0F7A4F"],
          borderWidth: 2,
          borderColor: "#FFFFFF"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 10, weight: "bold" } }
          }
        }
      }
    });
  },

  // 4. Perbandingan Jenis Kelamin & Terapi ADS (Slide 5 & 8)
  renderGenderChart(cases) {
    const ctx = document.getElementById("chart-gender");
    if (!ctx) return;

    let l = 0, p = 0;
    let adsYa = 0, adsTidak = 0;

    cases.forEach(c => {
      if (c.jenisKelamin === "L") l++;
      else p++;

      if (c.adsDiberikan) adsYa++;
      else adsTidak++;
    });

    const total = cases.length || 1;
    const pL = ((l / total) * 100).toFixed(1);
    const pP = ((p / total) * 100).toFixed(1);

    if (this.genderChart) {
      this.genderChart.destroy();
    }

    this.genderChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [`Laki-laki: ${l} (${pL}%)`, `Perempuan: ${p} (${pP}%)`],
        datasets: [{
          data: [l, p],
          backgroundColor: ["#2563EB", "#EC4899"],
          borderWidth: 2,
          borderColor: "#FFFFFF"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "55%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 10, weight: "bold" } }
          }
        }
      }
    });

    // Update Banner ADS jika ada elemennya
    const adsEl = document.getElementById("kpi-ads-text");
    if (adsEl) {
      const pAds = Math.round((adsYa / total) * 100);
      adsEl.innerText = `${adsYa} Kasus (${pAds}%) Diberi Terapi ADS | ${adsTidak} Tanpa ADS`;
    }
  },

  // 5. Update Angka Kontak Erat & Profilaksis (Slide 7: 690 / 83% Kontak Rumah)
  updateContactTracingNumbers(cases) {
    let kr = 0, profKr = 0;
    let ks = 0, profKs = 0;
    let kt = 0, profKt = 0;
    let kb = 0, profKb = 0;

    cases.forEach(c => {
      kr += (c.kontakRumah || c.kontakEratRumah || 0);
      profKr += (c.profilaksisRumah || c.kontakEratProfilaksis || 0);

      ks += (c.kontakSekolah || 0);
      profKs += (c.profilaksisSekolah || 0);

      kt += (c.kontakTetangga || 0);
      profKt += (c.profilaksisTetangga || 0);

      kb += (c.kontakBermain || 0);
      profKb += (c.profilaksisBermain || 0);
    });

    const tot = kr + ks + kt + kb;
    const totProf = profKr + profKs + profKt + profKb;

    const elTot = document.getElementById("contact-total-num");
    const elKr = document.getElementById("contact-kr-num");
    const elKs = document.getElementById("contact-ks-num");
    const elKt = document.getElementById("contact-kt-num");
    const elKb = document.getElementById("contact-kb-num");
    const elProf = document.getElementById("contact-prof-pct");

    if (elTot) elTot.innerText = `${tot} Orang`;
    if (elKr) {
      const pctKr = tot > 0 ? ((kr / tot) * 100).toFixed(1) : "0";
      elKr.innerText = `${kr} (${pctKr}%)`;
    }
    if (elKs) {
      const pctKs = tot > 0 ? ((ks / tot) * 100).toFixed(1) : "0";
      elKs.innerText = `${ks} (${pctKs}%)`;
    }
    if (elKt) {
      const pctKt = tot > 0 ? ((kt / tot) * 100).toFixed(1) : "0";
      elKt.innerText = `${kt} (${pctKt}%)`;
    }
    if (elKb) {
      const pctKb = tot > 0 ? ((kb / tot) * 100).toFixed(1) : "0";
      elKb.innerText = `${kb} (${pctKb}%)`;
    }
    if (elProf) {
      const pctProf = tot > 0 ? ((totProf / tot) * 100).toFixed(1) : "0";
      elProf.innerText = `${pctProf}%`;
    }
  }
};
