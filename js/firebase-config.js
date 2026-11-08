/**
 * SIDIF JAWA TIMUR - FIREBASE CLOUD CONFIGURATION
 * Konfigurasi Koneksi Google Cloud Firestore untuk Sinkronisasi Real-Time 38 Kab/Kota
 *
 * PANDUAN MENDAPATKAN KUNCI GRATIS DARI GOOGLE:
 * 1. Buka https://console.firebase.google.com/
 * 2. Buat Project baru (contoh: "sidif-jatim-2026")
 * 3. Masuk ke Project Settings -> General -> Your apps -> Tambahkan Web App (ikon </>)
 * 4. Salin objek firebaseConfig dan tempel nilainya di bawah ini (atau lewat Panel Superadmin di web).
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC8YAXd6S3qXkcHxwDU5NSvEi0Lyyg7t2Q",
  authDomain: "sidif-jatim.firebaseapp.com",
  projectId: "sidif-jatim",
  storageBucket: "sidif-jatim.firebasestorage.app",
  messagingSenderId: "986122781749",
  appId: "1:986122781749:web:4def65600b56597e60dd7c",
  measurementId: "G-W9TGGFQ5ZV"
};

// Cek apakah ada konfigurasi tersimpan di localStorage dari panel admin
try {
  const savedCfg = localStorage.getItem("sidif_firebase_custom_config");
  if (savedCfg) {
    const parsed = JSON.parse(savedCfg);
    if (parsed.projectId) {
      window.FIREBASE_CONFIG = parsed;
    }
  }
} catch (e) {}
