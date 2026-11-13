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
  stackedImunisasiChart: null,

  init() {
    this.renderAllCharts();
  },

  renderAllCharts(filteredCases = null) {
    const cases = filteredCases || window.SIDIF_STORE.getCases({ statusAdmin: "Terverifikasi" });
    this.renderEpiCurve(cases);
    this.renderStackedImunisasiUmur(cases);
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

  // 1B. Grafik Status Imunisasi Menurut Kelompok Umur (100% Stacked Bar Sesuai Slide 6 PPT Pimpinan Dinkes)
  renderStackedImunisasiUmur(cases) {
    const ctx = document.getElementById("chart-stacked-imunisasi-umur");
    if (!ctx) return;

    // 5 Kelompok Umur: < 1 tahun, 1 - 4 tahun, 5 - 9 tahun, 10 - 14 tahun, > 14 tahun
    const ageLabels = ["< 1 tahun", "1 - 4 tahun", "5 - 9 tahun", "10 - 14 tahun", "> 14 tahun"];
    const groups = [
      { tidak: 0, belum: 0, lengkap: 0, total: 0 }, // < 1 th
      { tidak: 0, belum: 0, lengkap: 0, total: 0 }, // 1 - 4 th
      { tidak: 0, belum: 0, lengkap: 0, total: 0 }, // 5 - 9 th
      { tidak: 0, belum: 0, lengkap: 0, total: 0 }, // 10 - 14 th
      { tidak: 0, belum: 0, lengkap: 0, total: 0 }  // > 14 th
    ];

    cases.forEach(c => {
      const thn = c.umurTahun !== undefined ? c.umurTahun : 0;
      let gIdx = 4;
      if (thn < 1) gIdx = 0;
      else if (thn >= 1 && thn <= 4) gIdx = 1;
      else if (thn >= 5 && thn <= 9) gIdx = 2;
      else if (thn >= 10 && thn <= 14) gIdx = 3;
      else gIdx = 4;

      const imm = (c.statusImunisasi || "").toLowerCase();
      const dosis = c.totalDosis !== undefined ? c.totalDosis : 0;

      if (imm.includes("tidak diimunisasi") || dosis === 0) {
        groups[gIdx].tidak++;
      } else if (imm.includes("lengkap") && !imm.includes("belum") || dosis >= 4) {
        groups[gIdx].lengkap++;
      } else {
        groups[gIdx].belum++;
      }
      groups[gIdx].total++;
    });

    // Hitung persentase proporsional 100% stacked bar
    const pTidak = [];
    const pBelum = [];
    const pLengkap = [];

    groups.forEach(g => {
      if (g.total === 0) {
        pTidak.push(0);
        pBelum.push(0);
        pLengkap.push(0);
      } else {
        const pctT = Math.round((g.tidak / g.total) * 100);
        const pctB = Math.round((g.belum / g.total) * 100);
        const pctL = Math.max(0, 100 - pctT - pctB);
        pTidak.push(pctT);
        pBelum.push(pctB);
        pLengkap.push(pctL);
      }
    });

    if (this.stackedImunisasiChart) {
      this.stackedImunisasiChart.destroy();
    }

    const self = this;
    this.stackedImunisasiChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ageLabels,
        datasets: [
          {
            label: "Tidak diimunisasi",
            data: pTidak,
            backgroundColor: "#DC2626", // Merah
            borderColor: "#B91C1C",
            borderWidth: 1,
            maxBarThickness: 48,
            borderRadius: 0
          },
          {
            label: "Imunisasi belum lengkap",
            data: pBelum,
            backgroundColor: "#FACC15", // Kuning
            borderColor: "#EAB308",
            borderWidth: 1,
            maxBarThickness: 48,
            borderRadius: 0
          },
          {
            label: "Imunisasi lengkap",
            data: pLengkap,
            backgroundColor: "#84CC16", // Hijau
            borderColor: "#65A30D",
            borderWidth: 1,
            maxBarThickness: 48,
            borderRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        categoryPercentage: 0.55,
        barPercentage: 0.8,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 10,
              font: { size: 10, weight: "bold" }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const g = groups[item.dataIndex];
                const rawCount = item.datasetIndex === 0 ? g.tidak : (item.datasetIndex === 1 ? g.belum : g.lengkap);
                return `${item.dataset.label}: ${item.raw}% (${rawCount} dari ${g.total} kasus)`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 10, weight: "bold" } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100, // Pas 100% proporsional
            ticks: {
              stepSize: 20,
              callback: (v) => v + "%",
              font: { size: 9 }
            },
            title: {
              display: true,
              text: "Proporsi Kasus (%)",
              font: { size: 10, weight: "bold" }
            }
          }
        }
      },
      plugins: [{
        id: "stackedPctLabels",
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, datasetIdx) => {
            const meta = chart.getDatasetMeta(datasetIdx);
            meta.data.forEach((bar, index) => {
              const val = dataset.data[index];
              if (val > 0) {
                ctx.save();
                ctx.fillStyle = datasetIdx === 1 ? "#78350F" : "#FFFFFF"; // Teks cokelat tua untuk kuning, putih untuk merah & hijau
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const yPos = (bar.y + bar.base) / 2;
                ctx.fillText(val + "%", bar.x, yPos);
                ctx.restore();
              }
            });
          });
        }
      }]
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
        rotation: 180, // KONSISTEN: Mulai dari jam 6 putar searah jarum jam -> Laki-laki di KIRI, Perempuan di KANAN
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              font: { size: 10, weight: "bold" },
              padding: 10
            }
          }
        }
      }
    });

    // Update teks kartu indikator cowok & cewek (Konsisten Kiri: Cowok, Kanan: Cewek)
    const maleTextEl = document.getElementById("gender-card-male-text");
    if (maleTextEl) maleTextEl.innerText = `${l} (${pL}%)`;

    const femaleTextEl = document.getElementById("gender-card-female-text");
    if (femaleTextEl) femaleTextEl.innerText = `${p} (${pP}%)`;

    const badgeRatio = document.getElementById("gender-ratio-badge");
    if (badgeRatio) badgeRatio.innerText = `Rasio ${Math.round(pL)}% : ${Math.round(pP)}%`;

    const summaryText = document.getElementById("gender-summary-text");
    if (summaryText) {
      if (Math.abs(pL - pP) <= 5) {
        summaryText.innerText = "Kasus pada laki-laki seimbang dengan perempuan";
      } else if (l > p) {
        summaryText.innerText = `Kasus lebih didominasi oleh laki-laki (${pL}%)`;
      } else {
        summaryText.innerText = `Kasus lebih didominasi oleh perempuan (${pP}%)`;
      }
    }

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
  },

  // 6. Ekspor Grafik ke Gambar PNG (Latar Belakang Putih Bersih untuk Bahan Paparan PowerPoint)
  downloadChart(canvasId, defaultFilename = "grafik-surveilans-difteri") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      alert("Grafik belum dimuat di layar.");
      return;
    }

    try {
      // Buat canvas sementara berlatar putih bersih (agar tidak transparan di PPT)
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext("2d");

      // Beri background putih pekat
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Gambar grafik di atasnya
      ctx.drawImage(canvas, 0, 0);

      // Trigger download berkas PNG
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().substring(0, 10);
      link.download = `${defaultFilename}_${dateStr}.png`;
      link.href = exportCanvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("Gagal mengekspor grafik:", err);
      alert("Gagal mengunduh grafik. Silakan coba kembali.");
    }
  }
};
