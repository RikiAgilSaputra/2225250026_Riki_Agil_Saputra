# Riwayat Bantuan AI — Pengembangan Aplikasi LangkahKu

| Atribut | Keterangan |
|---|---|
| Pengguna | Riki Agil Saputra (NIM 2225250026) |
| Asisten | Claude Code (model Claude Opus 5.5, Anthropic) |
| Tanggal | 9–10 November 2026 |
| Folder proyek | `2225250026_riki_agil_saputra/` |

> **Catatan:** Pesan pengguna ditulis **apa adanya**. Jawaban asisten ditulis sebagai **ringkasan** dari isi, keputusan, dan hasil kerjanya, karena jawaban aslinya sangat panjang dan banyak berupa penulisan file. Hasil kerja lengkapnya ada di file-file proyek yang dirujuk.

---

## Sesi 1 — Dokumen perencanaan

### 👤 Pengguna

> saya adalah seorang mahasiswa. Saat ini saya ingin membuat aplikasi matematika untuk siswa SMP. Aplikasi dapat dibuka di web dan android. Saya sudah melakukan wawancara pada seorang siswa terkait dengan beban kognitif dengan file terlampir. Sebelum membuat aplikasi, saya ingin dibuatkan file-file perencanaan pembuatan aplikasi, misal prd.md, claude.md, dan sebagainya secara lengkap dan profesional.

*Lampiran: `LAPORAN HASIL WAWANCARA.pdf` (siswa S01, kelas 9C, 4 November 2026, materi SPLDV; kode temuan K, IL, EL, GL, DS).*

### 🤖 Asisten — pertanyaan klarifikasi

Asisten mengajukan empat pertanyaan. Jawaban pengguna:

| Pertanyaan | Jawaban pengguna |
|---|---|
| Teknologi untuk web + Android? | **React + Vite + Python** |
| Cakupan materi versi pertama? | **Fokus SPLDV** (beserta materi prasyarat) |
| Perlu akun & dashboard guru? | **Login + dashboard guru** |
| Untuk penelitian/skripsi (R&D)? | **Tidak, proyek aplikasi saja** |

### 🤖 Asisten — hasil

Asisten menyusun rencana, pengguna menyetujuinya, lalu asisten membuat 15 file:

- `README.md`, `CLAUDE.md`, `.env.example`
- `docs/01-RESEARCH-INSIGHTS.md` s.d. `docs/12-ROADMAP.md`: sintesis wawancara dan persona, PRD (FR-01–FR-19), user stories (US-01–US-29), desain pembelajaran berbasis *Cognitive Load Theory*, spesifikasi konten, panduan UI/UX, arsitektur, model data, spesifikasi API, keamanan & privasi (UU PDP), rencana pengujian, dan roadmap ±10 minggu.

Setiap kode temuan wawancara (K01–DS03) dihubungkan ke minimal satu kebutuhan fungsional. Pertanyaan terbuka untuk pengguna: mode belajar tanpa kode kelas, mekanisme persetujuan orang tua, dan kurikulum acuan (K13 atau Kurikulum Merdeka).

---

## Sesi 2 — Literasi matematika & pemodel soal cerita

### 👤 Pengguna

> saya ingin aplikasi ini juga dapat menumbuhkembangkan literasi matematika siswa. Saya juga ingin aplikasi ini dapat memodelkan berbagai macam soal cerita ke dalam model matematika dan menyelesaikannya

### 🤖 Asisten — pertanyaan klarifikasi

| Pertanyaan | Jawaban pengguna |
|---|---|
| Siapa yang memodelkan soal cerita? | **Keduanya**: siswa memodelkan secara terpandu, **dan** AI (Claude API) memodelkan otomatis |
| Jenis model yang didukung? | **SPLDV saja** |

### 🤖 Asisten — hasil

- **Dokumen baru:**
  - `docs/13-MATH-LITERACY.md`: kerangka PISA 2022 & AKM Numerasi, siklus pemodelan 7 tahap, soal bertingkat L1–L3, bank konteks, dan profil literasi.
  - `docs/14-WORD-PROBLEM-MODELER.md`: pemodel mode A (terpandu, tanpa AI) dan mode B (AI). AI hanya menerjemahkan cerita; SymPy memverifikasi model (pemeriksaan V1–V7) dan menghitung jawabannya. Dokumen ini juga memuat set evaluasi 165 soal, perkiraan biaya, dan aturan privasi.
- **Dokumen lama diperbarui:** tujuan G7–G9, FR-20–FR-26, US-30–US-36, tabel database baru, endpoint `/modeler` dan `/literacy`, aturan wajib pemodel AI di CLAUDE.md, serta roadmap menjadi ±12 minggu.
- **Keputusan yang diambil asisten (boleh diubah):** AI nonaktif secara default per kelas; model `claude-opus-5-5` dengan effort `medium`; kuota 10 analisis per siswa per hari; batas anggaran $50 per bulan.
- **Pertanyaan terbuka:** siapa yang menanggung biaya Claude API?

---

## Sesi 3 — Membangun aplikasi

### 👤 Pengguna

> saya ingin dibuat aplikasi berbahasa javascript dan python yang dapat dijalankan di web pada sistem android, windows, mac, ataupun ios dan dapat diunduh langsung tanpa melalui play store ataupun appstore dengan ui ux menggunakan foto terlampir sebagai gambaran ui ux nya.

*Lampiran: gambar mockup dashboard aplikasi belajar matematika (sidebar, hero bermaskot burung hantu, "Lanjutkan Materi", "Bangun Keahlian", "Subjek Populer", sasaran harian, leaderboard).*

### 🤖 Asisten — pertanyaan klarifikasi

| Pertanyaan | Jawaban pengguna |
|---|---|
| Node.js belum terpasang; bagaimana? | **Pasang Node.js** (React + Vite sesuai dokumen) |
| Seberapa banyak yang dibangun? | **Versi pertama yang berfungsi** |
| Papan peringkat/poin/streak dari gambar? | **Versi ramah CLT**: papan peringkat hanya per kelas, memakai nama panggilan, dan bisa dimatikan guru |

### 🤖 Asisten — hasil

**Bentuk aplikasi:** PWA (*Progressive Web App*) yang bisa dipasang langsung dari browser di Android, Windows, macOS, dan iOS tanpa toko aplikasi.

**Backend (Python, `apps/api/`):**
- FastAPI, SQLAlchemy, SymPy, JWT, dan pemodel AI memakai SDK `anthropic`.
- Pemeriksa jawaban dengan klasifikasi kesalahan, pembangun langkah untuk 4 metode, dan generator soal acak.
- Poin, streak, sasaran harian, profil literasi, dan dashboard guru.

**Frontend (JavaScript/TypeScript, `apps/web/`):**
- React + Vite, dengan tata letak mengikuti gambar acuan.
- Logo, nama ("LangkahKu"), dan maskot burung hantu "Kiko" dibuat orisinal.
- Grafik interaktif, keypad matematika, mode gelap, dan teks besar.

**Konten (`content/modules/`):** 13 modul (4 prasyarat, 6 SPLDV, 3 literasi) dan 25 soal.

**Verifikasi:**
- 48 tes backend lolos, ditambah 3 tes frontend dan typecheck.
- Builder soal diuji dengan lebih dari 1.000 sistem persamaan acak.
- Validator konten menemukan satu pelanggaran aturan CLT, lalu diperbaiki.
- Uji tampilan di Chrome headless menemukan dua bug, keduanya diperbaiki:
  1. error 500 pada jawaban pertama siswa baru (sekarang ada tes regresinya);
  2. tata letak melebar keluar layar.
- Chrome menampilkan tombol "Pasang", tanda aplikasi memenuhi syarat PWA.

**Catatan penting dari asisten:**
- Agar bisa dipasang dari perangkat lain, aplikasi harus di-*deploy* ke alamat **HTTPS**.
- Pemodel AI baru aktif setelah `ANTHROPIC_API_KEY` diisi di `.env`. Panggilan Claude yang sebenarnya belum diuji; pengujian memakai respons tiruan.
- **Disederhanakan dari rencana** (dicatat di `CLAUDE.md`): SQLite menggantikan PostgreSQL, token disimpan di `localStorage`, grafik memakai SVG buatan sendiri, dan tanpa APK Capacitor.
- **Belum dibuat:** tes diagnostik, ekspor CSV, sinkronisasi jawaban offline, dan "Buat soal sendiri".
- Node.js v26.13 dipasang lewat winget.

**Cara menjalankan:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

Lalu buka http://localhost:8000. Akun demo: `siswa` / `siswa123` dan `guru` / `guru123` (kode kelas `K7Q2MX`).

---

## Sesi 4 — Menyimpan riwayat

### 👤 Pengguna

> simpan percakapan saya dan anda dalam sebuah file RIWAYAT_BANTUAN.md

### 🤖 Asisten

Membuat file ini.
