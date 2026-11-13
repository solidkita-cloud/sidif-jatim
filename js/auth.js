/**
 * SIDIF JAWA TIMUR - AUTHENTICATION & ACCESS CONTROL (RBAC)
 * Menangani login 38 Kabupaten/Kota + Provinsi, proteksi brute force, token reset 24 jam.
 */

const AUTH_KEYS = {
  CURRENT_USER: "sidif_current_user",
  FAILED_ATTEMPTS: "sidif_failed_attempts",
  LOCKOUT_TIME: "sidif_lockout_until",
  TOKENS: "sidif_reset_tokens"
};

window.SIDIF_AUTH = {
  // Ambil data akun yang sedang login
  getCurrentUser() {
    const raw = sessionStorage.getItem(AUTH_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  // Periksa apakah akun sedang dikunci karena 5x salah password
  isLockedOut() {
    const until = localStorage.getItem(AUTH_KEYS.LOCKOUT_TIME);
    if (!until) return false;
    const lockTime = parseInt(until, 10);
    if (Date.now() < lockTime) {
      const remainingMinutes = Math.ceil((lockTime - Date.now()) / 60000);
      return { locked: true, remainingMinutes };
    }
    // Waktu habis, hapus kunci
    localStorage.removeItem(AUTH_KEYS.LOCKOUT_TIME);
    localStorage.removeItem(AUTH_KEYS.FAILED_ATTEMPTS);
    return false;
  },

  // Proses Login
  login(username, password) {
    username = (username || "").trim().toUpperCase();
    password = (password || "").trim();

    // 1. Cek Lockout
    const lockStatus = this.isLockedOut();
    if (lockStatus && lockStatus.locked) {
      return {
        success: false,
        message: `Akun terkunci sementara karena 5x salah password. Coba lagi dalam ${lockStatus.remainingMinutes} menit.`
      };
    }

    // 2. Cari Akun Terdaftar
    const acc = window.SIDIF_CONFIG.accounts.find(a => a.username.toUpperCase() === username);
    if (!acc) {
      this.recordFailedAttempt();
      return { success: false, message: "Username tidak terdaftar dalam sistem SIDIF Jawa Timur." };
    }

    // 3. Verifikasi Password (Default: 12345678 atau Token Reset)
    const customPasswords = JSON.parse(localStorage.getItem("sidif_custom_passwords") || "{}");
    const activePassword = customPasswords[username] || window.SIDIF_CONFIG.passwordDefault;
    const tokens = JSON.parse(localStorage.getItem(AUTH_KEYS.TOKENS) || "{}");
    const validToken = tokens[username] && tokens[username].token === password && Date.now() < tokens[username].expires;

    if (password !== activePassword && !validToken) {
      this.recordFailedAttempt();
      return { success: false, message: "Kata sandi salah. Harap periksa kembali." };
    }

    // Berhasil Login - Reset catatan kegagalan
    localStorage.removeItem(AUTH_KEYS.FAILED_ATTEMPTS);
    localStorage.removeItem(AUTH_KEYS.LOCKOUT_TIME);

    const userSession = {
      username: acc.username,
      region: acc.region,
      type: acc.type,
      role: acc.role,
      loginAt: new Date().toISOString()
    };

    sessionStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(userSession));
    window.SIDIF_STORE.logAudit(acc.username, "LOGIN_SUCCESS", `Login berhasil untuk wilayah ${acc.region}`);
    if (window.SIDIF_APP && window.SIDIF_APP.updateMyPresence) {
      window.SIDIF_APP.updateMyPresence("Online Baru Saja");
    }

    return {
      success: true,
      user: userSession,
      isTokenLogin: validToken
    };
  },

  // Catat Percobaan Gagal (Maksimal 5x)
  recordFailedAttempt() {
    let attempts = parseInt(localStorage.getItem(AUTH_KEYS.FAILED_ATTEMPTS) || "0", 10) + 1;
    localStorage.setItem(AUTH_KEYS.FAILED_ATTEMPTS, attempts.toString());
    if (attempts >= 5) {
      const lockUntil = Date.now() + (15 * 60 * 1000); // Kunci 15 Menit
      localStorage.setItem(AUTH_KEYS.LOCKOUT_TIME, lockUntil.toString());
      window.SIDIF_STORE.logAudit("SECURITY_GUARD", "LOCKOUT_TRIGGERED", "Akun terkunci 15 menit akibat 5x percobaan gagal");
    }
  },

  // Logout
  logout() {
    const user = this.getCurrentUser();
    if (user) {
      window.SIDIF_STORE.logAudit(user.username, "LOGOUT", `Petugas keluar dari sistem`);
      if (window.SIDIF_APP && window.SIDIF_APP.removeOnlinePresence) {
        window.SIDIF_APP.removeOnlinePresence(user.username);
      }
    }
    sessionStorage.removeItem(AUTH_KEYS.CURRENT_USER);
  },

  // Terbitkan Token Reset Sandi 24 Jam (Khusus Admin Provinsi)
  generateResetToken(username) {
    username = (username || "").trim().toUpperCase();
    const tokenStr = "SIDIF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const tokens = JSON.parse(localStorage.getItem(AUTH_KEYS.TOKENS) || "{}");
    
    tokens[username] = {
      token: tokenStr,
      generatedAt: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 Jam
    };

    localStorage.setItem(AUTH_KEYS.TOKENS, JSON.stringify(tokens));
    window.SIDIF_STORE.logAudit("SUPERADMIN", "GENERATE_RESET_TOKEN", `Menerbitkan token reset 24 jam untuk akun ${username}`);
    return tokenStr;
  },

  // Ubah Kata Sandi Akun
  changePassword(username, newPassword) {
    const customPasswords = JSON.parse(localStorage.getItem("sidif_custom_passwords") || "{}");
    customPasswords[username.toUpperCase()] = newPassword;
    localStorage.setItem("sidif_custom_passwords", JSON.stringify(customPasswords));
    
    // Hapus token jika ada
    const tokens = JSON.parse(localStorage.getItem(AUTH_KEYS.TOKENS) || "{}");
    delete tokens[username.toUpperCase()];
    localStorage.setItem(AUTH_KEYS.TOKENS, JSON.stringify(tokens));

    window.SIDIF_STORE.logAudit(username, "CHANGE_PASSWORD", `Berhasil memperbarui kata sandi mandiri`);
  }
};
