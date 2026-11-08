/**
 * SIDIF JAWA TIMUR - CONFIGURATION & MASTER ACCOUNTS
 * Sesuai PRD v2.0 & Instruksi Pengguna
 */
window.SIDIF_CONFIG = {
  namaSitus: "SIDIF",
  subJudul: "Sistem Data Imunisasi & Surveilans Difteri Jawa Timur",
  instansi: "Dinas Kesehatan Provinsi Jawa Timur",
  version: "2.0.0",
  geojsonPath: "data/jatim-kabkota.geojson",
  passwordDefault: "12345678",
  
  // Daftar 40 Akun Bawaan (38 Kabupaten/Kota + Provinsi + Superadmin)
  accounts: [
    { username: "SIDIF_BKL", region: "Kabupaten Bangkalan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_BWI", region: "Kabupaten Banyuwangi", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBBLT", region: "Kabupaten Blitar", type: "kabupaten", role: "operator" },
    { username: "SIDIF_BJN", region: "Kabupaten Bojonegoro", type: "kabupaten", role: "operator" },
    { username: "SIDIF_BDW", region: "Kabupaten Bondowoso", type: "kabupaten", role: "operator" },
    { username: "SIDIF_GSK", region: "Kabupaten Gresik", type: "kabupaten", role: "operator" },
    { username: "SIDIF_JBR", region: "Kabupaten Jember", type: "kabupaten", role: "operator" },
    { username: "SIDIF_JBG", region: "Kabupaten Jombang", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBKDR", region: "Kabupaten Kediri", type: "kabupaten", role: "operator" },
    { username: "SIDIF_LMG", region: "Kabupaten Lamongan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_LMJ", region: "Kabupaten Lumajang", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBMDN", region: "Kabupaten Madiun", type: "kabupaten", role: "operator" },
    { username: "SIDIF_MGT", region: "Kabupaten Magetan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBMLG", region: "Kabupaten Malang", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBMJK", region: "Kabupaten Mojokerto", type: "kabupaten", role: "operator" },
    { username: "SIDIF_NGJ", region: "Kabupaten Nganjuk", type: "kabupaten", role: "operator" },
    { username: "SIDIF_NGW", region: "Kabupaten Ngawi", type: "kabupaten", role: "operator" },
    { username: "SIDIF_PCT", region: "Kabupaten Pacitan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_PMK", region: "Kabupaten Pamekasan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBPSR", region: "Kabupaten Pasuruan", type: "kabupaten", role: "operator" },
    { username: "SIDIF_PNO", region: "Kabupaten Ponorogo", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KBPRO", region: "Kabupaten Probolinggo", type: "kabupaten", role: "operator" },
    { username: "SIDIF_SPG", region: "Kabupaten Sampang", type: "kabupaten", role: "operator" },
    { username: "SIDIF_SDA", region: "Kabupaten Sidoarjo", type: "kabupaten", role: "operator" },
    { username: "SIDIF_STB", region: "Kabupaten Situbondo", type: "kabupaten", role: "operator" },
    { username: "SIDIF_SMP", region: "Kabupaten Sumenep", type: "kabupaten", role: "operator" },
    { username: "SIDIF_TRK", region: "Kabupaten Trenggalek", type: "kabupaten", role: "operator" },
    { username: "SIDIF_TBN", region: "Kabupaten Tuban", type: "kabupaten", role: "operator" },
    { username: "SIDIF_TA", region: "Kabupaten Tulungagung", type: "kabupaten", role: "operator" },
    { username: "SIDIF_KTBATU", region: "Kota Batu", type: "kota", role: "operator" },
    { username: "SIDIF_KTBLT", region: "Kota Blitar", type: "kota", role: "operator" },
    { username: "SIDIF_KTKDR", region: "Kota Kediri", type: "kota", role: "operator" },
    { username: "SIDIF_KTMDN", region: "Kota Madiun", type: "kota", role: "operator" },
    { username: "SIDIF_KTMLG", region: "Kota Malang", type: "kota", role: "operator" },
    { username: "SIDIF_KTMJK", region: "Kota Mojokerto", type: "kota", role: "operator" },
    { username: "SIDIF_KTPSR", region: "Kota Pasuruan", type: "kota", role: "operator" },
    { username: "SIDIF_KTPRO", region: "Kota Probolinggo", type: "kota", role: "operator" },
    { username: "SIDIF_SBY", region: "Kota Surabaya", type: "kota", role: "operator" },
    { username: "SIDIF_PROV", region: "Provinsi Jawa Timur", type: "provinsi", role: "verifikator" },
    { username: "SIDIF_ADMIN", region: "Provinsi Jawa Timur", type: "provinsi", role: "admin" },
    { username: "SIDIF_SUPERADMIN", region: "Provinsi Jawa Timur", type: "provinsi", role: "superadmin" }
  ]
};
