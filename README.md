# LangkahKu — Aplikasi Belajar SPLDV Berbasis Beban Kognitif

> *Nama kerja (working title). Dapat diganti sebelum rilis.*

**LangkahKu** adalah aplikasi pembelajaran matematika untuk siswa SMP (kelas 8–9) yang berfokus pada materi **Sistem Persamaan Linear Dua Variabel (SPLDV)** beserta materi prasyaratnya. Aplikasi dirancang dengan prinsip **Cognitive Load Theory (CLT)** agar siswa tidak kewalahan: satu konsep per layar, instruksi singkat, contoh soal bertahap, petunjuk langkah demi langkah, dan visualisasi koordinat Kartesius yang interaktif.

Aplikasi juga **menumbuhkembangkan literasi matematika** (PISA 2022 & AKM Numerasi) melalui siklus pemodelan soal cerita, bank soal literasi bertingkat, dan **pemodel soal cerita berbasis AI** yang mengubah soal cerita SPLDV apa pun menjadi model matematika yang diverifikasi lalu diselesaikan langkah demi langkah.

Aplikasi berjalan di **web (PWA)** dan **Android (APK via Capacitor)** dari satu basis kode, dengan **dashboard guru** untuk memantau progres dan kesulitan siswa.

---

## Latar Belakang Singkat

Wawancara dengan siswa kelas 9C (kode S01, 4 November 2026) menemukan bahwa siswa:

- bingung **memaknai dan menentukan nilai variabel** (K01, IL01, IL05);
- sering **tertukar rumus/langkah** antar-metode penyelesaian (IL02, IL05);
- **tidak tahu langkah berikutnya**, termasuk cara mencari titik potong (EL01, DS02);
- lebih mudah paham lewat **koordinat Kartesius** (EL03, GL01);
- pusing dengan **instruksi yang panjang** (EL05, DS03);
- belajar efektif dengan **contoh soal berpola sama, angka berbeda** (GL03, GL05).

Rincian lengkap: [docs/01-RESEARCH-INSIGHTS.md](docs/01-RESEARCH-INSIGHTS.md).

---

## Fitur Utama (MVP)

| Fitur | Untuk | Menjawab temuan |
|---|---|---|
| Tes diagnostik prasyarat + modul penyegaran | Siswa | K03, IL03 |
| Materi SPLDV *microlearning* (1 konsep per layar) | Siswa | EL02, EL04 |
| Kartu metode: Grafik, Substitusi, Eliminasi, Campuran | Siswa | IL02, IL05, DS01 |
| Solver terpandu langkah demi langkah + petunjuk 3 level | Siswa | EL01, DS02 |
| Grafik Kartesius interaktif (titik potong) | Siswa | EL03, GL01, K02 |
| Latihan berpola: contoh → melengkapi → mandiri | Siswa | GL03, GL05 |
| Langkah wajib "Tentukan variabel" untuk soal cerita | Siswa | K01, IL01 |
| Catatan pribadi per materi | Siswa | GL01 |
| Dashboard guru, analitik kesalahan, ekspor CSV | Guru | K02 |
| Siklus pemodelan 7 tahap & bank soal literasi L1–L3 | Siswa | K01, IL01, literasi |
| Pemodel soal cerita otomatis (Claude API + verifikasi SymPy) | Siswa, guru | K01, IL01, EL01 |
| Buat soal sendiri & profil literasi | Siswa, guru | GL04, literasi |

---

## Dokumen Perencanaan

| No | Dokumen | Isi |
|---|---|---|
| 01 | [Research Insights](docs/01-RESEARCH-INSIGHTS.md) | Sintesis wawancara, persona, matriks keterlacakan |
| 02 | [PRD](docs/02-PRD.md) | Product Requirements Document |
| 03 | [User Stories](docs/03-USER-STORIES.md) | Epik, user story, kriteria penerimaan |
| 04 | [Learning Design](docs/04-LEARNING-DESIGN.md) | Desain pembelajaran berbasis CLT |
| 05 | [Content Spec](docs/05-CONTENT-SPEC.md) | Peta materi & skema konten JSON |
| 06 | [UI/UX Guidelines](docs/06-UI-UX-GUIDELINES.md) | Design system, wireframe, aksesibilitas |
| 07 | [Architecture](docs/07-ARCHITECTURE.md) | Arsitektur sistem & keputusan teknis |
| 08 | [Data Model](docs/08-DATA-MODEL.md) | ERD & skema database |
| 09 | [API Spec](docs/09-API-SPEC.md) | Spesifikasi REST API |
| 10 | [Security & Privacy](docs/10-SECURITY-PRIVACY.md) | Keamanan & perlindungan data anak |
| 11 | [Test Plan](docs/11-TEST-PLAN.md) | Strategi pengujian |
| 12 | [Roadmap](docs/12-ROADMAP.md) | Milestone, sprint, risiko |
| 13 | [Math Literacy](docs/13-MATH-LITERACY.md) | Kerangka literasi matematika, siklus pemodelan, level L1–L3 |
| 14 | [Word Problem Modeler](docs/14-WORD-PROBLEM-MODELER.md) | Pemodel soal cerita (terpandu & AI), verifikasi, evaluasi, biaya |

Panduan untuk asisten AI (Claude Code): [CLAUDE.md](CLAUDE.md).

---

## Teknologi

- **Frontend (JavaScript/TypeScript):** React 18 + Vite, CSS dengan design tokens, grafik SVG interaktif buatan sendiri, PWA (vite-plugin-pwa)
- **Backend (Python):** FastAPI, SQLAlchemy 2, SymPy, JWT; SQLite untuk pengembangan, PostgreSQL untuk produksi
- **AI:** Claude API (`claude-opus-5-5`) melalui SDK Python `anthropic`, hanya untuk menerjemahkan soal cerita menjadi model
- **Database:** PostgreSQL

Detail: [docs/07-ARCHITECTURE.md](docs/07-ARCHITECTURE.md).

---

## Menjalankan

Prasyarat: **Python 3.12+** dan **Node.js 20+**.

```powershell
# Windows — satu perintah (build PWA + jalankan server)
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```
```bash
# macOS / Linux
sh scripts/start.sh
```

Buka **http://localhost:8000**. Akun demo: siswa `siswa` / `siswa123`, guru `guru` / `guru123` (kode kelas `K7Q2MX`).

Pemodel AI butuh kunci API: salin `.env.example` menjadi `.env`, isi `ANTHROPIC_API_KEY`, lalu jalankan ulang. Tanpa kunci, fitur lain tetap berjalan dan pemodel menampilkan pesan "belum aktif".

### Pengembangan

```bash
# Backend (apps/api) — API di :8000, dokumentasi di /docs
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m pytest -q          # 48 tes, tanpa memanggil Claude API

# Frontend (apps/web) — hot reload di :5173, /api diteruskan ke :8000
npm run dev
npm test && npm run typecheck

# Konten (dari root)
apps/api/.venv/Scripts/python scripts/validate_content.py
```

## Memasang di HP & Laptop (tanpa Play Store / App Store)

LangkahKu adalah **PWA** (Progressive Web App): dibuka lewat browser lalu dipasang seperti aplikasi biasa, dengan ikon di layar utama, jendela sendiri, dan bisa dipakai offline untuk materi yang sudah dibuka.

| Perangkat | Cara memasang |
|---|---|
| Android (Chrome) | Buka alamat aplikasi → tombol **Pasang sekarang** di menu, atau ⋮ → *Instal aplikasi* |
| Windows / Mac (Chrome, Edge) | Ikon ⊕ di bilah alamat, atau tombol **Pasang sekarang** |
| iPhone / iPad (Safari) | Tombol **Bagikan** → *Tambah ke Layar Utama* |
| Mac (Safari 17+) | Menu *File* → *Add to Dock* |

> **Penting:** browser hanya mengizinkan pemasangan dari **HTTPS** (kecuali `localhost`). Agar HP lain bisa memasang, aplikasi harus di-*deploy*.

## Deploy

Frontend di **Netlify**, backend di **Render**, database di **Neon** (semua paket gratis, deploy otomatis setiap `git push`). Konfigurasi: [netlify.toml](netlify.toml), [render.yaml](render.yaml). Langkah lengkap: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Status

✅ **v0.1 berfungsi**: alur inti (login, materi, solver terpandu, grafik, latihan acak, siklus pemodelan, pemodel AI, kemajuan, catatan, dashboard guru) dan PWA yang bisa dipasang. Selanjutnya: lihat [Roadmap](docs/12-ROADMAP.md) dan bagian "Perbedaan v0.1" di [CLAUDE.md](CLAUDE.md).

## Penulis

Riki Agil Saputra — NIM 2225250026
