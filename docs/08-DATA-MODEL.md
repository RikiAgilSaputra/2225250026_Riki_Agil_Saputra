# 08 — Data Model

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| DBMS | PostgreSQL 16 |
| Acuan | [07-ARCHITECTURE.md](07-ARCHITECTURE.md) |

---

## 1. ERD

```mermaid
erDiagram
    users ||--o{ classes : "mengajar (guru)"
    users ||--o{ class_members : "anggota (siswa)"
    classes ||--o{ class_members : memiliki
    users ||--o{ refresh_tokens : memiliki
    modules ||--o{ lessons : berisi
    modules ||--o{ problems : berisi
    users ||--o{ attempts : mengerjakan
    problems ||--o{ attempts : dikerjakan
    attempts ||--o{ step_attempts : terdiri
    users ||--o{ module_progress : memiliki
    modules ||--o{ module_progress : dilacak
    users ||--o{ diagnostic_results : memiliki
    users ||--o{ notes : menulis
    modules ||--o{ notes : terkait
    users ||--o{ audit_logs : melakukan
    users ||--o{ modeler_submissions : mengirim
    classes ||--o{ modeler_submissions : dalam
    classes ||--o{ class_problems : "bank soal kelas"
    problems ||--o{ class_problems : dimasukkan
    modeler_submissions |o--o| problems : "menjadi (setelah disetujui)"

    modeler_submissions {
        uuid id PK
        uuid user_id FK
        uuid class_id FK
        text purpose "solve|posing"
        text input_text
        text input_hash
        jsonb posing_target "nullable"
        text status "verified|verified_special|unverified|not_spldv|rejected"
        jsonb model_json
        jsonb verification_json
        bool repaired
        text llm_model
        text prompt_version
        int input_tokens
        int output_tokens
        int latency_ms
        smallint rating "-1|0|1"
        text rating_reason
        text review_status "none|pending|approved|rejected"
        text problem_id FK "nullable"
        timestamptz created_at
    }
    class_problems {
        uuid class_id PK,FK
        text problem_id PK,FK
        uuid approved_by FK
        timestamptz approved_at
    }

    users {
        uuid id PK
        text role "student|teacher|admin"
        text username UK
        text email "nullable, hanya guru/admin"
        text password_hash
        text display_name
        text status "active|pending|disabled"
        bool must_change_password
        jsonb preferences "large_text, dark_mode"
        timestamptz created_at
        timestamptz last_active_at
    }
    classes {
        uuid id PK
        uuid teacher_id FK
        text name
        smallint grade
        text join_code UK
        bool join_code_active
        jsonb ai_settings "enabled, daily_quota, allow_full_solution"
        timestamptz created_at
    }
    class_members {
        uuid class_id PK,FK
        uuid student_id PK,FK
        timestamptz joined_at
    }
    modules {
        text id PK "PRE-1, SPL-4"
        text kind "prerequisite|spldv"
        text title
        smallint order_index
        text content_version
    }
    lessons {
        text id PK
        text module_id FK
        text objective
        jsonb recall
        jsonb screens
    }
    problems {
        text id PK
        text module_id FK
        text pattern
        text mode "worked|completion|independent|diagnostic|template"
        text method
        jsonb context
        jsonb system
        jsonb solution
        jsonb steps
        jsonb template_params
        text source "content|ai|teacher|student_posed"
        jsonb story
        jsonb literacy "level, context_category, representation, akm_cognitive, item_format"
    }
    attempts {
        uuid id PK
        uuid student_id FK
        text problem_id FK
        int seed
        jsonb problem_snapshot
        text method
        numeric score
        text explanation
        timestamptz started_at
        timestamptz completed_at
    }
    step_attempts {
        uuid id PK
        uuid attempt_id FK
        text step_id
        text answer_raw
        bool is_correct
        text error_code
        smallint hint_level_used
        bool revealed
        int duration_ms
        timestamptz client_created_at
        timestamptz created_at
    }
    module_progress {
        uuid student_id PK,FK
        text module_id PK,FK
        text status "not_started|in_progress|completed"
        text last_screen_id
        numeric best_score
        timestamptz mastered_at
        timestamptz updated_at
    }
    diagnostic_results {
        uuid id PK
        uuid student_id FK
        jsonb answers
        jsonb topic_scores
        int total_score
        timestamptz created_at
    }
    notes {
        uuid id PK
        uuid student_id FK
        text module_id FK
        text screen_id
        text body
        jsonb attachments
        timestamptz updated_at
    }
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token_hash
        text device_label
        timestamptz expires_at
        timestamptz revoked_at
    }
    audit_logs {
        bigint id PK
        uuid actor_id FK
        text action
        text target_type
        text target_id
        timestamptz created_at
    }
```

## 2. Kamus Data Ringkas

### users
| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` | |
| role | text | NOT NULL, CHECK in (`student`,`teacher`,`admin`) | |
| username | citext | UNIQUE NOT NULL | 3–30 karakter, `[a-z0-9_.]` |
| email | citext | UNIQUE NULL | Wajib untuk guru/admin; **tidak dikumpulkan dari siswa** |
| password_hash | text | NOT NULL | bcrypt cost 12 |
| display_name | text | NOT NULL | Nama panggilan, maks. 40 karakter |
| status | text | default `active` | Guru baru → `pending` |
| must_change_password | bool | default false | true setelah reset oleh guru |
| preferences | jsonb | default `{}` | `{ "large_text": bool, "dark_mode": bool }` (FR-19) |

### step_attempts (sumber utama analitik)
| Kolom | Keterangan |
|---|---|
| step_id | ID langkah dari `problems.steps[].id` |
| answer_raw | Teks jawaban siswa (maks. 100 karakter) |
| error_code | `SIGN_ERROR`, `ARITH_ERROR`, `VAR_SWAP`, `PARTIAL_MULTIPLY`, `WRONG_METHOD_STEP`, `FORMAT`, `UNKNOWN`, atau NULL bila benar |
| hint_level_used | 0–3, level petunjuk tertinggi yang dibuka sebelum jawaban ini |
| revealed | Siswa menekan "Tampilkan jawaban langkah ini" |
| client_created_at | Waktu di perangkat (untuk sinkronisasi offline) |

### modeler_submissions (pemodel AI)
| Kolom | Keterangan |
|---|---|
| input_text | Teks soal setelah penyamaran PII (maks. 1.000 karakter) |
| input_hash | SHA-256 dari teks ternormalisasi, untuk cache hasil yang sudah terverifikasi |
| model_json | Keluaran `WordProblemModel` dari Claude |
| verification_json | Hasil V1–V7, solusi SymPy, alasan gagal |
| repaired | Apakah perlu satu putaran perbaikan |
| llm_model, prompt_version, input_tokens, output_tokens, latency_ms | Pemantauan kualitas & biaya |
| rating, rating_reason | Umpan balik 👍/👎 siswa |
| review_status, problem_id | Alur persetujuan guru → bank soal kelas |

### classes.ai_settings
`{ "enabled": false, "daily_quota": 10, "allow_full_solution": true }`. Default `enabled: false`.

## 3. Indeks

| Tabel | Indeks | Tujuan |
|---|---|---|
| classes | `UNIQUE(join_code)` | Gabung kelas |
| class_members | `(student_id)` | Kelas milik siswa |
| attempts | `(student_id, problem_id, started_at DESC)` | Riwayat siswa |
| step_attempts | `(attempt_id)` | Detail attempt |
| step_attempts | `(created_at)` | Analitik periode |
| module_progress | `(module_id, status)` | Ringkasan kelas |
| refresh_tokens | `(token_hash)` | Validasi refresh |
| modeler_submissions | `(input_hash) WHERE status IN ('verified','verified_special')` | Cache hasil |
| modeler_submissions | `(user_id, created_at)` | Hitung kuota harian |
| modeler_submissions | `(class_id, review_status)` | Antrean tinjauan guru |
| problems | `((literacy->>'level'), (literacy->>'context_category'))` | Filter bank soal literasi |

## 4. Aturan Integritas & Retensi

- Hapus siswa → `ON DELETE CASCADE` ke `class_members`, `attempts`, `step_attempts`, `module_progress`, `diagnostic_results`, `notes`, `refresh_tokens`.
- Hapus guru → kelas dipindahkan ke admin atau dihapus setelah konfirmasi (tidak otomatis).
- Konten (`modules`, `lessons`, `problems`) di-*upsert* oleh `seed_content.py`; soal yang sudah pernah dikerjakan tidak dihapus, hanya ditandai `content_version` lama. `attempts.problem_snapshot` menjaga riwayat tetap konsisten.
- `modeler_submissions.input_text` siswa dihapus setelah 180 hari (metadata token & status disimpan untuk statistik), kecuali sudah disetujui guru menjadi soal.
- Retensi: data siswa yang tidak aktif > 2 tahun dianonimkan (lihat [10-SECURITY-PRIVACY.md](10-SECURITY-PRIVACY.md)).

## 5. Migrasi

- Semua perubahan skema melalui Alembic (`alembic revision --autogenerate`), ditinjau manual sebelum commit.
- Ekstensi yang diperlukan: `pgcrypto` (UUID), `citext`.
