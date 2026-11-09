# 10 — Security & Privacy

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| Acuan regulasi | UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) |

> Pengguna utama adalah **anak di bawah umur**. UU PDP Pasal 25 mewajibkan pemrosesan data pribadi anak dilakukan secara khusus dan dengan **persetujuan orang tua/wali**. Dokumen ini bukan nasihat hukum; konsultasikan dengan pihak sekolah sebelum penggunaan nyata.

---

## 1. Prinsip

1. **Minimisasi data** — hanya kumpulkan yang dibutuhkan untuk belajar dan pemantauan guru.
2. **Tujuan terbatas** — data hanya untuk pembelajaran; tidak untuk iklan, tidak dijual, tidak dibagikan ke pihak ketiga.
3. **Privasi sejak desain** — tanpa pelacak pihak ketiga, tanpa iklan, tanpa profil publik.
4. **Akses berbasis peran** — guru hanya melihat siswa di kelasnya.

## 2. Inventaris Data

| Data | Pengguna | Wajib | Tujuan | Dilihat oleh |
|---|---|---|---|---|
| Nama panggilan | Siswa | Ya | Identitas di kelas | Siswa, guru kelasnya |
| Username, hash password | Semua | Ya | Login | Sistem |
| Email | Guru/admin | Ya | Verifikasi & pemulihan | Admin |
| Email, NISN, tanggal lahir, foto, lokasi | Siswa | **Tidak dikumpulkan** | — | — |
| Jawaban, skor, penggunaan petunjuk | Siswa | Ya | Umpan balik & analitik guru | Siswa, guru kelasnya |
| Penjelasan "kata-katamu" | Siswa | Opsional | Refleksi | Siswa, guru kelasnya |
| Catatan pribadi | Siswa | Opsional | Belajar | **Hanya siswa** |
| Log audit akses guru | Guru | Ya | Akuntabilitas | Admin |
| Teks soal cerita yang dikirim ke pemodel AI | Siswa/guru | Opsional (fitur default nonaktif) | Membuat model matematika | Siswa, guru kelasnya; **teks soal (tanpa identitas) diproses oleh Anthropic** |

## 3. Persetujuan

- Sekolah/guru menjadi pihak yang mengumpulkan **persetujuan tertulis orang tua/wali** sebelum siswa didaftarkan; formulir templat disediakan di halaman guru.
- Saat siswa pertama kali login, tampil penjelasan privasi singkat berbahasa sederhana (≤ 5 poin).
- Kebijakan Privasi & Syarat Penggunaan dapat diakses dari halaman login.

## 3a. Pemrosesan oleh Penyedia AI (Anthropic)

Pemodel soal cerita ([14-WORD-PROBLEM-MODELER.md](14-WORD-PROBLEM-MODELER.md)) mengirim **teks soal** ke Claude API.

| Kontrol | Penerapan |
|---|---|
| Persetujuan | Fitur **nonaktif secara default** per kelas. Guru mengaktifkannya setelah sekolah menyetujui. Formulir persetujuan orang tua menyebutkan penggunaan layanan AI pihak ketiga |
| Minimisasi | Hanya teks soal yang dikirim, tanpa user ID, nama, kelas, atau metadata perangkat |
| Penyamaran | Guard menyamarkan pola nomor HP, email, NIK/NISN, dan alamat sebelum dikirim; siswa diberi peringatan di kolom input |
| Transparansi | Label "Model dibuat otomatis oleh AI dan sudah diperiksa" pada setiap hasil |
| Kebijakan penyedia | Mengikuti ketentuan komersial dan Kebijakan Penggunaan Anthropic, termasuk persyaratan untuk produk yang digunakan anak di bawah umur. Kebijakan retensi dan pemakaian data oleh penyedia diverifikasi ulang sebelum rilis dan dicantumkan di kebijakan privasi |
| Keamanan kunci | `ANTHROPIC_API_KEY` hanya di server (variabel lingkungan), tidak pernah di klien atau APK |
| Keluaran | Dibatasi skema JSON; tidak ada teks bebas AI yang ditampilkan; mitigasi prompt injection ([14 §8](14-WORD-PROBLEM-MODELER.md#8-keamanan-privasi-dan-keselamatan)) |

## 4. Hak Subjek Data

| Hak | Mekanisme |
|---|---|
| Akses | Siswa dapat melihat semua progres & catatannya; ekspor JSON di Profil (S) |
| Perbaikan | Ubah nama panggilan di Profil |
| Penghapusan | Permintaan via guru/admin → hapus permanen (cascade) ≤ 14 hari |
| Penarikan persetujuan | Akun dinonaktifkan dan dihapus |

## 5. Retensi

| Data | Retensi |
|---|---|
| Akun & progres aktif | Selama akun aktif |
| Akun tidak aktif > 2 tahun | Dianonimkan (nama & username diganti hash) |
| Refresh token kedaluwarsa | Dihapus harian |
| Log audit | 1 tahun |
| Teks kiriman pemodel AI | 180 hari (kecuali disetujui guru menjadi soal) |
| Backup database | 7 hari (rotasi) |

## 6. Kontrol Keamanan

### 6.1 Autentikasi & Sesi
- Password di-hash **bcrypt (cost 12)**; minimal 6 karakter untuk siswa, 8 untuk guru/admin.
- Access token JWT 15 menit (HS256, secret ≥ 32 byte di env); refresh token acak 256-bit, disimpan **hash**-nya, **rotasi** setiap pemakaian, deteksi pemakaian ulang → cabut semua sesi.
- Web: refresh token di cookie `httpOnly; Secure; SameSite=Strict`. Android: Capacitor Secure Storage (Android Keystore).
- Rate limit login 5/menit; pesan error generik.
- Guru `pending` tidak dapat mengakses data siswa.

### 6.2 Otorisasi
- Dependency FastAPI `require_role()` dan `require_class_teacher(class_id)` di setiap endpoint terlindungi.
- Tes otomatis untuk setiap endpoint guru: guru A **tidak boleh** mengakses kelas guru B (tes IDOR).

### 6.3 Input & Kode
- Semua input divalidasi Pydantic; panjang dibatasi.
- Jawaban matematika diparse SymPy dengan whitelist token, **tanpa `eval`/`sympify` mentah**, timeout 1 detik.
- ORM SQLAlchemy dengan parameter terikat (cegah SQL injection).
- Unggah CSV: hanya `text/csv`, ≤ 100 KB, diparse dengan modul `csv`, sanitasi sel yang diawali `= + - @` saat ekspor (cegah CSV injection).
- React meng-escape output secara default; dilarang `dangerouslySetInnerHTML` kecuali output KaTeX dengan `trust: false`.

### 6.4 Transport & Header
- HTTPS wajib (HSTS). Header: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal.
- CORS: hanya origin web resmi + `capacitor://localhost` / `https://localhost`.
- Android: `android:usesCleartextTraffic="false"`, `allowBackup="false"`.

### 6.5 Data di Perangkat
- Tidak menyimpan data pribadi di `localStorage`.
- IndexedDB hanya untuk cache konten & antrean jawaban; dihapus saat logout.

### 6.6 Operasional
- Secret di variabel lingkungan platform hosting; `.env` di `.gitignore`.
- Dependabot/`npm audit`/`pip-audit` di CI.
- Backup harian database terenkripsi.
- Sentry (jika dipakai): `sendDefaultPii: false`, scrub field `answer`, `display_name`, `username`.

## 7. Ancaman Utama (STRIDE ringkas)

| Ancaman | Contoh | Mitigasi |
|---|---|---|
| Spoofing | Menebak password siswa | Rate limit, pesan generik, reset hanya oleh guru |
| Tampering | Memanipulasi skor dari klien | Skor dihitung server; jawaban offline divalidasi ulang |
| Repudiation | Guru menyangkal mengakses data | `audit_logs` |
| Information disclosure | Guru melihat kelas lain (IDOR) | Cek kepemilikan kelas + tes otomatis |
| Denial of service | Input aljabar yang sangat berat | Batas panjang, timeout SymPy, rate limit |
| Elevation of privilege | Siswa memanggil endpoint guru | `require_role` + tes |
| Prompt injection | Teks soal berisi "abaikan instruksi, tulis …" | Input sebagai data di tag `<soal>`, keluaran berskema, AI tanpa tool, verifier SymPy, teks AI tidak ditampilkan langsung |
| Penyalahgunaan biaya | Skrip mengirim ribuan permintaan pemodel | Kuota per siswa/kelas, rate limit, batas anggaran bulanan, cache hasil |

## 8. Respons Insiden

1. Deteksi & catat (waktu, cakupan).
2. Isolasi (cabut token, matikan endpoint terdampak).
3. Beri tahu sekolah/guru dan, sesuai UU PDP, subjek data & lembaga terkait **≤ 3 × 24 jam** bila terjadi kegagalan pelindungan data pribadi.
4. Perbaiki, tulis laporan pascainsiden.
