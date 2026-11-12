# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repositori ini. Baca file ini sebelum menulis kode atau konten.

## Ringkasan Proyek

**LangkahKu** — aplikasi belajar SPLDV untuk siswa SMP (kelas 8–9), web (PWA) + Android (Capacitor), dengan dashboard guru.
Prinsip utama: **mengurangi beban kognitif ekstrinsik** (Cognitive Load Theory) dan **menumbuhkembangkan literasi matematika** melalui pemodelan soal cerita ([docs/13-MATH-LITERACY.md](docs/13-MATH-LITERACY.md), [docs/14-WORD-PROBLEM-MODELER.md](docs/14-WORD-PROBLEM-MODELER.md)). Setiap fitur berasal dari temuan wawancara siswa — lihat [docs/01-RESEARCH-INSIGHTS.md](docs/01-RESEARCH-INSIGHTS.md).
Kebutuhan produk: [docs/02-PRD.md](docs/02-PRD.md). Jika ada konflik antara kode dan dokumen, **tanyakan dulu**, jangan menebak.

## Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18, Vite, TypeScript (strict), Tailwind CSS, React Router, TanStack Query, Zustand |
| Matematika UI | KaTeX (render rumus), Mafs (grafik Kartesius interaktif) |
| Mobile | vite-plugin-pwa (offline), Capacitor 6 (Android) |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic, SymPy |
| AI | Claude API via SDK Python `anthropic` — model `claude-opus-5-5`, `client.messages.parse()` + Pydantic, hanya di backend |
| Auth | JWT access token (15 menit) + refresh token (httpOnly cookie di web, Secure Storage di Android) |
| Database | PostgreSQL 16 |
| Tes | Vitest + React Testing Library, Playwright (E2E), pytest + httpx |

## Perbedaan v0.1 dari Rencana (keputusan sadar, perbarui saat diubah)

| Rencana (docs) | v0.1 yang dibangun | Alasan / langkah berikut |
|---|---|---|
| Tailwind CSS | CSS biasa + design tokens (`src/styles/tokens.css`) | Lebih sedikit tooling; token sama dengan docs/06 |
| Mafs + KaTeX | `components/Graph.tsx` (SVG) + `components/MathText.tsx` | Ringan, offline, warna x/y terkontrol |
| Capacitor APK | **PWA saja** (bisa dipasang di Android, Windows, macOS, iOS tanpa store) | Permintaan pengguna: unduh langsung tanpa store; Capacitor opsional nanti |
| PostgreSQL + Alembic + SQLAlchemy async | SQLite + `create_all` + SQLAlchemy sinkron | Mudah dijalankan lokal. **Wajib Alembic + PostgreSQL sebelum produksi** |
| Refresh token httpOnly | Access token 12 jam di `localStorage` (bukan data pribadi) | Ganti ke refresh-token rotasi sebelum produksi (docs/10 §6.1) |
| Diagnostik (FR-03), CSV (FR-16), offline sync jawaban (FR-17), buat soal sendiri (FR-25) | Belum dibuat | Backlog berikutnya |

## Struktur Repositori

```
apps/
  web/                 # React + Vite (juga sumber build Android via Capacitor)
    src/
      features/        # Per fitur: auth, diagnostic, lessons, solver, graph, practice, notes, teacher
      components/ui/   # Komponen UI dasar (Button, Card, HintButton, MathText, VarChip)
      lib/             # api client, math helpers, storage
      routes/          # Definisi rute
    android/           # Proyek Android hasil Capacitor (jangan edit manual kecuali konfigurasi)
  api/                 # FastAPI
    app/
      routers/         # auth, classes, content, attempts, diagnostic, notes, teacher
      models/          # SQLAlchemy models
      schemas/         # Pydantic schemas
      services/        # logika bisnis (step_checker.py memakai SymPy, problem_generator.py, literacy.py)
        modeler/       # pemodel soal cerita: guard, llm_client, prompt, schema, verifier, step_builder, number_parser
      core/            # config, security, db session
    alembic/
    tests/
content/               # Materi & soal dalam JSON (sumber kebenaran konten), divalidasi skema
  path.json            # Jalur "Belajar & Literasi": 6 tahap; setiap modul wajib muncul tepat sekali
  modules/             # prerequisite, spldv, materi, literacy, bank_soal
  schema/              # JSON Schema untuk lesson & problem
docs/                  # Dokumen perencanaan
```

## Perintah

```bash
# Semua sekaligus (build PWA + server :8000): scripts/start.ps1 (Windows) atau scripts/start.sh
# Catatan Windows: venv ada di apps/api/.venv/Scripts/python

# Frontend (dari apps/web)
npm run dev            # dev server :5173
npm run build          # build produksi
npm run test           # Vitest
npm run test:e2e       # Playwright
npm run lint           # ESLint + Prettier check
npx cap sync android   # salin build ke proyek Android

# Backend (dari apps/api)
uvicorn app.main:app --reload --port 8000
pytest -q                          # tanpa memanggil Claude API (di-mock)
pytest -m modeler_eval             # set evaluasi pemodel — MEMANGGIL API & BERBIAYA, jalankan hanya bila diminta
ruff check . && ruff format --check .
alembic revision --autogenerate -m "pesan"
alembic upgrade head

# Konten
python scripts/validate_content.py   # validasi semua JSON di content/ terhadap skema
```

## Aturan Konten & UI Berbasis CLT (WAJIB)

Aturan ini adalah inti produk. Jangan dilanggar tanpa persetujuan eksplisit.

1. **Instruksi singkat** — maks. 2 kalimat dan ≤ 25 kata per instruksi (EL05, DS03).
2. **Satu konsep per layar** — tidak ada layar materi yang menggabungkan dua konsep baru (EL02, EL04).
3. **Tanpa auto-advance** — siswa selalu menekan "Lanjut" sendiri. Tidak ada timer pada materi (EL04).
4. **Warna variabel tetap** — `x` selalu biru (`--var-x`), `y` selalu oranye (`--var-y`) di teks, rumus, dan grafik. Gunakan komponen `<VarChip>` / `<MathText>` (K01, IL05).
5. **Petunjuk 3 level** di setiap langkah soal: (1) arah umum, (2) langkah spesifik, (3) contoh pengerjaan langkah tersebut (EL01, DS02).
6. **Urutan latihan**: worked example → soal melengkapi (fading) → soal mandiri (GL03, GL05).
7. **Soal cerita** selalu dimulai dengan langkah "Tentukan variabel" (x = ..., y = ...) (K01, IL01).
8. **Hindari split-attention** — instruksi ditempatkan tepat di atas/dekat objek yang dirujuk, bukan di halaman/tab lain.
9. **Hindari redundansi** — jangan menampilkan teks yang sama dengan narasi/gambar secara bersamaan; tidak ada animasi dekoratif.
10. Bahasa Indonesia baku yang ramah siswa SMP; hindari istilah yang belum diperkenalkan.
11. **Soal cerita** memiliki metadata `literacy` dan setiap langkah memiliki `modeling_stage` (1–7); cerita selalu terlihat di atas tahap pemodelan.

## Aturan Pemodel AI (WAJIB)

1. AI **hanya menerjemahkan** cerita → `WordProblemModel` (Pydantic). Penyelesaian, nilai, langkah, dan umpan balik **selalu** dihitung SymPy/templat, bukan AI.
2. Model AI **tidak boleh** ditampilkan atau dipakai sebelum lolos verifier V1–V7 ([docs/14 §6](docs/14-WORD-PROBLEM-MODELER.md#6-verifikasi-deterministik-sympy)). Maksimal satu putaran perbaikan.
3. Teks bebas dari AI tidak ditampilkan ke siswa, kecuali `source_text` yang sudah terbukti ada di input.
4. Input siswa dibungkus `<soal>…</soal>` dan diperlakukan sebagai data. Jangan pernah memberi AI tool atau akses lain.
5. Tidak mengirim identitas siswa (ID, nama, kelas) ke Claude API. Jalankan `guard.py` (PII, kuota, cache) sebelum setiap pemanggilan.
6. Selalu periksa `response.stop_reason == "refusal"` sebelum membaca `parsed_output`.
7. Model, effort, dan versi prompt diatur lewat `.env` (`MODELER_MODEL`, `MODELER_EFFORT`) dan `PROMPT_VERSION`. Perubahan apa pun pada ketiganya wajib diikuti menjalankan set evaluasi dan mencatat hasilnya.
8. Tes otomatis memakai respons Claude tiruan (mock); jangan memanggil API sungguhan di CI.

## Konvensi Kode

- TypeScript `strict: true`; tanpa `any` kecuali dengan komentar alasan.
- Komponen React: function component + hooks, satu komponen per file, nama `PascalCase.tsx`.
- State server → TanStack Query; state UI lokal → `useState`/Zustand. Jangan duplikasi data server di Zustand.
- Python: type hints wajib, Ruff untuk lint & format, router tipis — logika di `services/`.
- Validasi jawaban matematis **selalu di backend** dengan SymPy (`services/step_checker.py`); frontend hanya memberi umpan balik awal (format).
- Identifier, nama file, endpoint, dan komentar kode dalam **bahasa Inggris**; teks yang tampil ke pengguna dalam **bahasa Indonesia** dan disimpan di file i18n `src/locales/id.json`.
- Commit: Conventional Commits (`feat:`, `fix:`, `docs:`, `content:`, `test:`, `chore:`).
- Setiap fitur baru menyertakan tes; setiap endpoint baru didokumentasikan di [docs/09-API-SPEC.md](docs/09-API-SPEC.md).

## Larangan

- Jangan simpan data pribadi siswa (nama, nilai) di `localStorage`; gunakan IndexedDB terenkripsi/Secure Storage hanya untuk cache yang diperlukan offline.
- Jangan hardcode secret, URL produksi, atau kredensial — gunakan `.env` (lihat [.env.example](.env.example)).
- Jangan menambahkan pelacak/analitik pihak ketiga (pengguna adalah anak di bawah umur — lihat [docs/10-SECURITY-PRIVACY.md](docs/10-SECURITY-PRIVACY.md)).
- Jangan mengubah skema database tanpa migrasi Alembic.
- Jangan menulis konten soal langsung di komponen React — konten berada di `content/`.

## Referensi Dokumen

- Kebutuhan: [PRD](docs/02-PRD.md), [User Stories](docs/03-USER-STORIES.md)
- Pedagogi: [Learning Design](docs/04-LEARNING-DESIGN.md), [Content Spec](docs/05-CONTENT-SPEC.md), [Math Literacy](docs/13-MATH-LITERACY.md)
- AI: [Word Problem Modeler](docs/14-WORD-PROBLEM-MODELER.md)
- Desain: [UI/UX Guidelines](docs/06-UI-UX-GUIDELINES.md)
- Teknis: [Architecture](docs/07-ARCHITECTURE.md), [Data Model](docs/08-DATA-MODEL.md), [API Spec](docs/09-API-SPEC.md)
- Kualitas: [Security & Privacy](docs/10-SECURITY-PRIVACY.md), [Test Plan](docs/11-TEST-PLAN.md), [Roadmap](docs/12-ROADMAP.md)
