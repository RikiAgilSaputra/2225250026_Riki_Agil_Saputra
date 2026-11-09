# 09 — API Specification

| Atribut | Nilai |
|---|---|
| Versi API | v1 |
| Base URL | `https://api.<domain>/api/v1` (lokal: `http://localhost:8000/api/v1`) |
| Format | JSON (UTF-8), kecuali ekspor CSV |
| Autentikasi | `Authorization: Bearer <access_token>` |
| Dokumentasi interaktif | `/docs` (Swagger, hanya non-produksi) |

---

## 1. Konvensi

- Nama field `snake_case`; waktu ISO 8601 UTC.
- Paginasi: `?limit=20&cursor=<opaque>` → respons `{ "items": [...], "next_cursor": "..." }`.
- Peran ditandai: 🎓 siswa, 👩‍🏫 guru, 🛠 admin, 🌐 publik.
- Guru hanya dapat mengakses data siswa di kelasnya sendiri (diperiksa di setiap endpoint `/teacher/*`).

### Format Error

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Username atau password salah." } }
```

| HTTP | `code` umum |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JOIN_CODE` |
| 401 | `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` |
| 403 | `FORBIDDEN`, `ACCOUNT_PENDING`, `PASSWORD_CHANGE_REQUIRED` |
| 404 | `NOT_FOUND` |
| 409 | `USERNAME_TAKEN` |
| 422 | `UNPARSEABLE_ANSWER` |
| 429 | `RATE_LIMITED` |

---

## 2. Auth

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| POST | `/auth/login` | 🌐 | Login |
| POST | `/auth/refresh` | 🌐 | Rotasi refresh token |
| POST | `/auth/logout` | semua | Cabut refresh token |
| POST | `/auth/register-student` | 🌐 | Daftar siswa via kode kelas |
| POST | `/auth/register-teacher` | 🌐 | Daftar guru (status `pending`) |
| GET | `/me` | semua | Profil pengguna |
| PATCH | `/me` | semua | Ubah nama panggilan, preferensi (teks besar, mode gelap) |
| POST | `/me/password` | semua | Ganti password |

**POST `/auth/login`**
```json
// request
{ "username": "nadia8a", "password": "******", "client": "web" }
// 200
{
  "access_token": "eyJ...",
  "expires_in": 900,
  "refresh_token": "…",          // hanya bila client = "android"; web via Set-Cookie
  "user": { "id": "…", "role": "student", "display_name": "Nadia", "must_change_password": false }
}
```

**POST `/auth/register-student`**
```json
{ "join_code": "K7Q2MX", "display_name": "Nadia", "username": "nadia8a", "password": "******" }
```

---

## 3. Kelas (guru)

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/classes` | 👩‍🏫 🎓 | Kelas milik guru / kelas yang diikuti siswa |
| POST | `/classes` | 👩‍🏫 | Buat kelas `{name, grade}` → `{id, join_code}` |
| PATCH | `/classes/{id}` | 👩‍🏫 | Ubah nama, nonaktifkan kode |
| POST | `/classes/{id}/join-code/regenerate` | 👩‍🏫 | Buat kode baru |
| GET | `/classes/{id}/students` | 👩‍🏫 | Daftar siswa |
| POST | `/classes/{id}/students/bulk` | 👩‍🏫 | Unggah CSV → akun + password sementara |
| POST | `/classes/{id}/students/{sid}/reset-password` | 👩‍🏫 | Reset password → `{temporary_password}` |
| DELETE | `/classes/{id}/students/{sid}` | 👩‍🏫 | Keluarkan siswa dari kelas |
| POST | `/classes/join` | 🎓 | Siswa yang sudah punya akun bergabung `{join_code}` |

---

## 4. Konten

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/modules` | 🎓 👩‍🏫 | Daftar modul + progres siswa (untuk siswa) |
| GET | `/modules/{module_id}` | 🎓 👩‍🏫 | Detail modul: lesson, kartu metode, daftar pola soal |
| GET | `/lessons/{lesson_id}` | 🎓 👩‍🏫 | Layar-layar materi |
| GET | `/problems/{problem_id}` | 🎓 | Soal worked/completion (langkah `prefilled` berisi jawaban) |
| POST | `/problems/templates/{template_id}/generate` | 🎓 | Buat soal baru dari templat → soal tanpa kunci jawaban |
| PUT | `/progress/{module_id}` | 🎓 | Simpan `{last_screen_id, status}` |

**GET `/modules`** (siswa)
```json
{
  "items": [
    { "id": "PRE-1", "kind": "prerequisite", "title": "Bilangan Bulat", "status": "completed", "best_score": 90, "recommended": false },
    { "id": "SPL-4", "kind": "spldv", "title": "Metode Substitusi", "status": "in_progress", "last_screen_id": "SPL-4-s3", "best_score": null, "recommended": true }
  ]
}
```

---

## 5. Attempt & Langkah

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| POST | `/attempts` | 🎓 | Mulai pengerjaan |
| GET | `/attempts/{id}` | 🎓 | Status attempt (lanjutkan) |
| POST | `/attempts/{id}/steps` | 🎓 | Kirim jawaban langkah → validasi |
| POST | `/attempts/{id}/steps/{step_id}/hint` | 🎓 | Buka petunjuk level berikutnya |
| POST | `/attempts/{id}/steps/{step_id}/reveal` | 🎓 | Tampilkan jawaban langkah |
| POST | `/attempts/{id}/complete` | 🎓 | Selesaikan + `explanation` opsional (FR-13) |
| POST | `/attempts/sync` | 🎓 | Sinkron batch jawaban offline |
| GET | `/attempts?module_id=` | 🎓 | Riwayat |

**POST `/attempts`**
```json
// request
{ "problem_id": "SPL-4-A-ind-1", "method": "substitution" }
// atau soal generator
{ "template_id": "SPL-4-A", "seed": 482913, "method": "substitution" }

// 201
{
  "attempt_id": "…",
  "problem": {
    "id": "SPL-4-A-ind-1",
    "mode": "independent",
    "context": null,
    "system": ["2*x + y = 7", "3*x + y = 10"],
    "steps": [
      { "id": "s1", "instruction": "Ubah persamaan (1) menjadi y = ...", "check": "equation_equivalent", "prefilled": false }
    ]
  }
}
```

**POST `/attempts/{id}/steps`**
```json
// request
{ "step_id": "s1", "answer": "y = 7 + 2x", "duration_ms": 18400, "client_created_at": "2026-11-20T03:10:00Z" }

// 200
{
  "correct": false,
  "error_code": "SIGN_ERROR",
  "feedback": "Periksa tanda saat memindahkan 2x.",
  "attempts_on_step": 2,
  "suggest_hint": false
}
// 200 (benar)
{ "correct": true, "feedback": "Benar!", "normalized": "y = 7 - 2x", "next_step_id": "s2" }
```

**POST `/attempts/{id}/steps/{step_id}/hint`**
```json
// 200
{ "level": 2, "text": "Pindahkan 2x ke ruas kanan. Tandanya berubah." }
```

**POST `/attempts/sync`**
```json
{
  "items": [
    { "attempt_id": "…", "step_id": "s3", "answer": "x = 3", "hint_level_used": 1, "client_created_at": "…" }
  ]
}
// 200 → { "results": [ { "index": 0, "correct": true } ] }
```

---

## 6. Diagnostik

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/diagnostic` | 🎓 | Soal diagnostik (tanpa kunci) |
| POST | `/diagnostic/submit` | 🎓 | Kirim jawaban → skor per topik + rekomendasi |
| GET | `/diagnostic/results` | 🎓 | Riwayat hasil |

```json
// 200 POST /diagnostic/submit
{
  "total_score": 6,
  "topic_scores": { "integers": 1.0, "linear_eq": 0.5, "cartesian": 1.0, "function": 0.0 },
  "recommended_modules": ["PRE-2", "PRE-4"]
}
```

---

## 7. Catatan

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/notes?module_id=` | 🎓 | Daftar catatan |
| POST | `/notes` | 🎓 | Buat `{module_id, screen_id?, body, attachments?}` |
| PATCH | `/notes/{id}` | 🎓 | Ubah |
| DELETE | `/notes/{id}` | 🎓 | Hapus |

Catatan pribadi **tidak** dapat dibaca guru.

---

## 8. Dashboard Guru

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/teacher/classes/{id}/summary` | 👩‍🏫 | Kartu ringkasan kelas |
| GET | `/teacher/classes/{id}/students` | 👩‍🏫 | Tabel siswa + skor per modul |
| GET | `/teacher/classes/{id}/heatmap?module_id=` | 👩‍🏫 | Tingkat kesalahan per (pattern, step) |
| GET | `/teacher/classes/{id}/heatmap/{pattern}/{step_id}` | 👩‍🏫 | Siswa & error_code untuk satu sel |
| GET | `/teacher/students/{sid}` | 👩‍🏫 | Detail siswa (diagnostik, progres, petunjuk, penjelasan) |
| GET | `/teacher/classes/{id}/export.csv` | 👩‍🏫 | Ekspor CSV (UTF-8 BOM) |

```json
// 200 GET /teacher/classes/{id}/heatmap?module_id=SPL-5
{
  "patterns": [
    {
      "pattern": "SPL-5-B",
      "steps": [
        { "step_id": "s1", "error_rate": 0.42, "hint3_rate": 0.18, "top_error": "PARTIAL_MULTIPLY", "n": 31 },
        { "step_id": "s2", "error_rate": 0.12, "hint3_rate": 0.03, "top_error": "SIGN_ERROR", "n": 29 }
      ]
    }
  ]
}
```

---

## 8a. Literasi & Pemodel Soal Cerita

### Literasi

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/literacy/problems?level=L1&context=personal` | 🎓 | Daftar soal literasi (bank resmi + bank kelas) dengan status kunci level |
| GET | `/literacy/me` | 🎓 | Profil literasi diri (indikator & level terbuka) |
| GET | `/teacher/classes/{id}/literacy` | 👩‍🏫 | Profil literasi kelas per indikator & konteks |
| POST | `/teacher/classes/{id}/literacy/unlock` | 👩‍🏫 | Buka level L2/L3 untuk siswa tertentu `{student_ids, level}` |

Soal literasi dikerjakan melalui `/attempts` seperti soal lain.

### Pemodel (AI)

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| POST | `/modeler/analyze` | 🎓 👩‍🏫 | Ubah soal cerita → model SPLDV terverifikasi |
| GET | `/modeler/quota` | 🎓 | Sisa kuota hari ini |
| POST | `/modeler/{submission_id}/attempt` | 🎓 | Mulai pengerjaan dari model `{mode, method}` |
| POST | `/modeler/{submission_id}/rating` | 🎓 👩‍🏫 | 👍/👎 `{rating, reason?}` |
| POST | `/modeler/posing` | 🎓 | Buat soal sendiri `{target_system, story}` |
| POST | `/modeler/{submission_id}/submit-for-review` | 🎓 | Ajukan ke guru |
| GET | `/teacher/classes/{id}/modeler-submissions?status=&review_status=` | 👩‍🏫 | Daftar kiriman siswa |
| POST | `/teacher/modeler-submissions/{id}/approve` | 👩‍🏫 | Setujui → soal bank kelas `{level, context_category, edits?}` |
| PATCH | `/classes/{id}/ai-settings` | 👩‍🏫 | `{enabled, daily_quota, allow_full_solution}` |

**POST `/modeler/analyze`**
```json
// request
{ "text": "Harga 2 buku dan 3 pensil Rp19.000. Harga 1 buku dan 2 pensil Rp11.000. Berapa harga 1 buku?" }

// 200 (verified)
{
  "submission_id": "…",
  "status": "verified",
  "cached": false,
  "model": {
    "variables": [
      { "symbol": "x", "meaning": "harga 1 buku", "unit": "rupiah" },
      { "symbol": "y", "meaning": "harga 1 pensil", "unit": "rupiah" }
    ],
    "equations": [
      { "source_text": "Harga 2 buku dan 3 pensil Rp19.000", "math_sentence": "2 × harga buku + 3 × harga pensil = 19.000", "equation": "2*x + 3*y = 19000" },
      { "source_text": "Harga 1 buku dan 2 pensil Rp11.000", "math_sentence": "harga buku + 2 × harga pensil = 11.000", "equation": "x + 2*y = 11000" }
    ],
    "question_text": "Berapa harga 1 buku?",
    "target": "x",
    "target_unit": "rupiah",
    "context_category": "personal"
  },
  "allowed_modes": ["guided", "model_only", "worked"],
  "quota_remaining": 9
}
// 200 (bukan SPLDV)
{ "submission_id": "…", "status": "not_spldv", "message": "Soal ini bukan SPLDV, jadi belum bisa dimodelkan di sini." }
```
Solusi **tidak** dikirim di respons ini; solusi hanya muncul melalui alur attempt sesuai mode.

| HTTP | `code` khusus pemodel |
|---|---|
| 403 | `AI_DISABLED_FOR_CLASS`, `FULL_SOLUTION_NOT_ALLOWED` |
| 413 | `INPUT_TOO_LONG` |
| 429 | `QUOTA_EXCEEDED`, `MODELER_BUSY` |
| 503 | `MODELER_BUDGET_PAUSED`, `MODELER_UNAVAILABLE` |

**POST `/modeler/{submission_id}/attempt`**
```json
// request — mode: guided | model_only | worked
{ "mode": "guided", "method": "elimination" }
// 201 → sama dengan respons POST /attempts (problem.source = "ai")
```

**POST `/modeler/posing`**
```json
// request
{ "target_system": ["2*x + y = 10", "x + y = 7"], "story": "Ani membeli 2 apel dan 1 jeruk seharga Rp10.000 ..." }
// 200
{ "submission_id": "…", "match": false, "matched_equations": [0], "student_model": ["2*x + y = 10", "2*x + 2*y = 10"], "feedback": "Persamaan (2) belum sesuai dengan ceritamu." }
```

## 9. Admin

| Metode | Endpoint | Peran | Deskripsi |
|---|---|---|---|
| GET | `/admin/teachers?status=pending` | 🛠 | Daftar guru menunggu verifikasi |
| POST | `/admin/teachers/{id}/approve` | 🛠 | Setujui guru |
| PATCH | `/admin/users/{id}` | 🛠 | Nonaktifkan/aktifkan akun |
| GET | `/admin/stats` | 🛠 | Jumlah pengguna, kelas, attempt harian |
| GET | `/admin/modeler/usage?month=2026-12` | 🛠 | Jumlah analisis, token, perkiraan biaya, distribusi status |

---

## 10. Batasan & Keamanan

| Endpoint | Batas |
|---|---|
| `/auth/login` | 5 permintaan/menit per IP + username |
| `/auth/register-*` | 10/jam per IP |
| `/attempts/{id}/steps` | 60/menit per pengguna; jawaban ≤ 100 karakter |
| `/classes/{id}/students/bulk` | CSV ≤ 200 baris, ≤ 100 KB |
| `/modeler/analyze`, `/modeler/posing` | Kuota harian kelas (default 10/siswa) + 3/menit per pengguna; teks ≤ 1.000 (posing ≤ 500) karakter |

Semua endpoint di belakang HTTPS; CORS hanya untuk origin web resmi dan `capacitor://localhost`.
