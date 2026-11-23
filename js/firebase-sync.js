/**
 * SIDIF JAWA TIMUR - GOOGLE CLOUD FIRESTORE REAL-TIME SYNCHRONIZER
 * Menyediakan sinkronisasi data online real-time antara 38 Kabupaten/Kota dengan Laptop Provinsi.
 * Mendukung mode Offline-First (tetap bekerja via LocalStorage jika kunci Cloud belum dimasukkan).
 */

window.SIDIF_CLOUD = {
  db: null,
  isOnline: false,
  unsubscribeListener: null,

  init() {
    this.updateStatusBadge();

    // Pastikan Firebase SDK dan Konfigurasi Kunci Tersedia
    if (window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.isOnline = true;
        this.updateStatusBadge();
        console.log("SIDIF: Terhubung ke Google Cloud Firestore (Project:", window.FIREBASE_CONFIG.projectId, ")");

        // Pasang Real-Time Listener
        this.startRealtimeListener();

        // Cek dan Unggah Data Awal jika Database Cloud Masih Kosong
        this.seedCloudIfEmpty();

        // Segarkan kehadiran (presence) ke Cloud setelah koneksi stabil
        if (window.SIDIF_APP && window.SIDIF_APP.updateMyPresence) {
          window.SIDIF_APP.updateMyPresence();
        }

      } catch (err) {
        console.warn("SIDIF: Gagal menginisialisasi Google Cloud Firestore, menggunakan mode lokal:", err.message);
        this.isOnline = false;
        this.updateStatusBadge();
      }
    } else {
      console.log("SIDIF: Berjalan dalam Mode Database Lokal (Siap dihubungkan ke Google Cloud Firestore).");
      this.updateStatusBadge();
    }
  },

  // Perbarui Lencana Status Koneksi di Header
  updateStatusBadge() {
    const badge = document.getElementById("cloud-status-badge");
    if (!badge) return;

    if (this.isOnline) {
      badge.className = "flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 shadow-2xs cursor-pointer";
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span><span>Cloud Aktif: ${window.FIREBASE_CONFIG.projectId}</span>`;
      badge.title = "Terhubung ke Google Cloud Firestore (Sinkronisasi Real-Time 38 Kab/Kota Aktif)";
    } else {
      badge.className = "flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-800 shadow-2xs cursor-pointer hover:bg-amber-100 transition";
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Mode Lokal (Klik untuk Hubungkan Cloud)</span>`;
      badge.title = "Klik untuk memasukkan Kunci Google Cloud Firebase Anda";
    }
  },

  // Pasang Listener Real-Time (Mendengarkan Laporan Baru Masuk Seketika)
  startRealtimeListener() {
    if (!this.db) return;

    const casesCol = this.db.collection("difteri_cases_2026");
    const currentUser = window.SIDIF_AUTH ? window.SIDIF_AUTH.getCurrentUser() : null;

    this.unsubscribeListener = casesCol.onSnapshot((snapshot) => {
      let hasChanges = false;
      const remoteCases = [];

      snapshot.docChanges().forEach((change) => {
        const cData = change.doc.data();
        if (change.type === "added") {
          // Jika laporan baru berasal dari daerah lain dan bukan buatan sesi ini
          if (currentUser && cData.createdBy !== currentUser.username) {
            window.SIDIF_APP.triggerRealtimeNotification(cData);
          }
          hasChanges = true;
        }
        if (change.type === "modified" || change.type === "removed") {
          hasChanges = true;
        }
      });

      snapshot.forEach((doc) => {
        remoteCases.push(doc.data());
      });

      if (hasChanges && remoteCases.length > 0) {
        // Selaraskan ke LocalStorage
        localStorage.setItem("sidif_cases_v4", JSON.stringify(remoteCases));
        
        // Refresh Tampilan jika pengguna sedang di Dashboard atau Tabel
        if (window.SIDIF_APP.activeView === "dashboard") {
          window.SIDIF_APP.applyDashboardFilters();
        } else if (window.SIDIF_APP.activeView === "table-data") {
          window.SIDIF_APP.renderTableData();
        }
      }
    }, (error) => {
      console.error("Firestore listener error:", error);
    });

    // Pasang Listener Real-Time untuk Ruang Koordinasi & Chat Tim Difteri
    try {
      let isInitialChatBatch = true;
      const chatCol = this.db.collection("difteri_chat_2026").orderBy("timestamp", "asc").limitToLast(50);
      chatCol.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            if (window.SIDIF_APP && window.SIDIF_APP.receiveChatMessage) {
              window.SIDIF_APP.receiveChatMessage(msg, isInitialChatBatch);
            }
          }
        });
        isInitialChatBatch = false;
      }, (err) => {
        console.warn("Firestore chat listener warning:", err.message);
      });
    } catch (e) {
      console.warn("Chat listener setup bypassed:", e);
    }

    // Pasang Listener Real-Time untuk Status Petugas Online (Presence Lintas Laptop)
    try {
      const presenceCol = this.db.collection("difteri_presence_2026");
      presenceCol.onSnapshot((snapshot) => {
        const presenceMap = {};
        const now = Date.now();
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Anggap aktif jika mengirim sinyal dalam 3 menit terakhir
          if (now - (data.lastPing || 0) < 3 * 60 * 1000) {
            presenceMap[data.username] = data;
          }
        });
        if (window.SIDIF_APP && window.SIDIF_APP.updateCloudPresenceMap) {
          window.SIDIF_APP.updateCloudPresenceMap(presenceMap);
        }
      }, (err) => {
        console.warn("Firestore presence listener warning:", err.message);
      });
    } catch (e) {
      console.warn("Presence listener setup bypassed:", e);
    }
  },

  // Sinkronkan Status Presence ke Cloud Firestore
  async syncPresenceToCloud(presenceData) {
    if (!this.db || !this.isOnline || !presenceData || !presenceData.username) return false;
    try {
      await this.db.collection("difteri_presence_2026").doc(presenceData.username).set(presenceData, { merge: true });
      return true;
    } catch (e) {
      console.warn("Gagal sinkronisasi status presence ke Cloud:", e);
      return false;
    }
  },

  // Hapus Status Presence dari Cloud Firestore (saat Logout atau Tutup Tab)
  async removePresenceFromCloud(username) {
    if (!this.db || !this.isOnline || !username) return false;
    try {
      await this.db.collection("difteri_presence_2026").doc(username).delete();
      return true;
    } catch (e) {
      console.warn("Gagal menghapus status presence dari Cloud:", e);
      return false;
    }
  },

  // Kirim Pesan Koordinasi Chat ke Google Cloud Firestore
  async sendChatMessageToCloud(msgObj) {
    if (!this.db || !this.isOnline) return false;
    try {
      await this.db.collection("difteri_chat_2026").add(msgObj);
      return true;
    } catch (e) {
      console.warn("Gagal mengirim pesan chat ke Cloud:", e);
      return false;
    }
  },

  // Simpan Kasus ke Cloud Firestore
  async syncCaseToCloud(caseData) {
    if (!this.db || !this.isOnline) return false;

    try {
      await this.db.collection("difteri_cases_2026").doc(caseData.id).set(caseData, { merge: true });
      window.SIDIF_STORE.logAudit("SYSTEM_CLOUD", "CLOUD_SYNC_SUCCESS", `Berhasil menyinkronkan kasus ${caseData.noEpid} ke Google Cloud Firestore.`);
      return true;
    } catch (e) {
      console.error("Gagal sinkronisasi ke Cloud:", e);
      return false;
    }
  },

  // Unggah Kasus Awal jika Database Cloud Baru Masih Kosong
  async seedCloudIfEmpty() {
    if (!this.db || !this.isOnline) return;

    try {
      const snap = await this.db.collection("difteri_cases_2026").limit(1).get();
      if (snap.empty) {
        console.log("Database Firestore kosong, mengunggah 277 kasus Jawa Timur ke Cloud...");
        const localCases = window.SIDIF_STORE.getCases();
        const batch = this.db.batch();

        // Unggah bertahap (batch max 500)
        localCases.slice(0, 450).forEach(c => {
          const ref = this.db.collection("difteri_cases_2026").doc(c.id);
          batch.set(ref, c);
        });

        await batch.commit();
        console.log("Berhasil mengunggah dataset awal ke Google Cloud Firestore.");
      }
    } catch (e) {
      console.warn("Cek seed Cloud dilewati:", e.message);
    }
  },

  // Simpan Konfigurasi Kunci Baru dari Panel Admin
  saveCustomConfig(configObj) {
    if (!configObj || !configObj.projectId) {
      alert("Konfigurasi tidak valid. Wajib menyertakan minimal 'projectId' dan 'apiKey'.");
      return false;
    }
    localStorage.setItem("sidif_firebase_custom_config", JSON.stringify(configObj));
    window.FIREBASE_CONFIG = configObj;
    this.init();
    alert("Konfigurasi Google Cloud Firestore berhasil disimpan. Sistem sedang menghubungkan...");
    return true;
  }
};
