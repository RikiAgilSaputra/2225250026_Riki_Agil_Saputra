# 11 — Test Plan

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| Acuan | [02-PRD.md](02-PRD.md), [03-USER-STORIES.md](03-USER-STORIES.md) |

---

## 1. Tujuan

1. Memastikan setiap kebutuhan fungsional (FR) dan non-fungsional (NFR) terpenuhi.
2. Menjamin **kebenaran matematis** validasi jawaban dan soal yang dihasilkan generator.
3. Memvalidasi bahwa aplikasi benar-benar **menurunkan beban kognitif** bagi siswa (uji pengguna).

## 2. Piramida Pengujian

| Level | Alat | Cakupan | Target |
|---|---|---|---|
| Unit (backend) | pytest | `step_checker`, `error_classifier`, `problem_generator`, `scoring`, `analytics` | ≥ 90% modul inti, ≥ 80% keseluruhan |
| Unit (frontend) | Vitest + RTL | Komponen `MathText`, `StepCard`, `HintButton`, `MathKeypad`, store solver, offline queue | ≥ 70% |
| Integrasi API | pytest + httpx + Postgres (Docker) | Semua endpoint, otorisasi per peran | Semua endpoint |
| Validasi konten | `validate_content.py` | Skema, aturan CLT, kebenaran kunci jawaban | 100% file konten |
| E2E | Playwright (Chromium + emulasi Pixel 5) | Alur kritis (§4) | 8 skenario |
| Perangkat nyata | Manual | Android 8, 11, 14; HP RAM 3 GB | Setiap rilis |
| Kinerja | Lighthouse CI, k6 | NFR-01, NFR-02 | Setiap rilis |
| Keamanan | pip-audit, npm audit, tes IDOR, OWASP ZAP baseline | NFR-07 | Setiap rilis |
| Aksesibilitas | axe-core (Playwright), cek manual TalkBack | NFR-09 | Setiap rilis |
| Evaluasi pemodel AI | pytest `-m modeler_eval` (memanggil Claude API, berbiaya) | 165 kasus ([14 §9](14-WORD-PROBLEM-MODELER.md#9-evaluasi-kualitas-pemodel)) | Setiap perubahan prompt/model/effort + sebelum rilis |
| Unit pemodel (tanpa API) | pytest dengan respons Claude tiruan (*mock*) | `guard`, `verifier` V1–V7, `number_parser`, `step_builder` | Setiap commit |
| Uji pengguna | Sesi dengan siswa & guru | Tujuan G1–G9 | M4 |

## 3. Kasus Uji Kritis — Step Checker

| ID | `check` | Kunci | Jawaban | Harapan |
|---|---|---|---|---|
| SC-01 | equation_equivalent | `y = 7 - 2*x` | `y=7-2x` | benar |
| SC-02 | equation_equivalent | `y = 7 - 2*x` | `2x + y = 7` | benar (setara) |
| SC-03 | equation_equivalent | `y = 7 - 2*x` | `y = 7 + 2x` | salah, `SIGN_ERROR` |
| SC-04 | equation_equivalent | `6*x + 3*y = 21` | `6x + 3y = 7` | salah, `PARTIAL_MULTIPLY` |
| SC-05 | value | `x = 3` | `x = 3.0` | benar |
| SC-06 | value | `x = 1/2` | `x = 0.5` | benar |
| SC-07 | point | `(3, 1)` | `(1, 3)` | salah, `VAR_SWAP` |
| SC-08 | any | — | `__import__('os')` | 422 `UNPARSEABLE_ANSWER`, tidak dieksekusi |
| SC-09 | any | — | 101 karakter | 422 |
| SC-10 | equation_equivalent | — | `x**99999999` | ditolak/timeout ≤ 1 detik |
| SC-11 | equation_equivalent | `y = 7 - 2*x` | `y = 7 − 2x` (minus Unicode) | benar |

## 3a. Kasus Uji Kritis — Verifier Pemodel (tanpa API)

| ID | Masukan (model AI tiruan) | Harapan |
|---|---|---|
| MV-01 | 2 persamaan linear, angka ada di teks, solusi positif | `verified` |
| MV-02 | Persamaan memuat `x*y` | gagal V2 → perbaikan |
| MV-03 | Konstanta 21000 tidak ada di teks | gagal V3 (jejak angka) |
| MV-04 | `source_text` tidak ditemukan di teks | gagal V4 |
| MV-05 | Banyak ayam = 12,5 (harus bulat) | gagal V6 (kewajaran) |
| MV-06 | Dua garis sejajar | `verified_special` |
| MV-07 | Teks "Rp19 ribu" dan konstanta 19000 | lolos V3 (number parser) |
| MV-08 | Kaki kambing 4 tidak tertulis di teks | lolos V3 (daftar putih pengetahuan umum) |
| MV-09 | Perbaikan juga gagal | `unverified`, model tidak dikirim ke siswa |
| MV-10 | Teks berisi nomor HP 0812xxxx | nomor disamarkan sebelum dikirim |
| MV-11 | Kuota habis | 429 `QUOTA_EXCEEDED`, Claude tidak dipanggil |
| MV-12 | Teks sama dengan kiriman terverifikasi sebelumnya | `cached: true`, Claude tidak dipanggil |

## 4. Skenario E2E

| ID | Skenario | Langkah ringkas |
|---|---|---|
| E2E-01 | Guru membuat kelas, siswa bergabung | Guru daftar → admin setujui → guru buat kelas → siswa daftar dengan kode → muncul di daftar siswa |
| E2E-02 | Diagnostik → rekomendasi | Siswa kerjakan diagnostik dengan jawaban topik fungsi salah → rekomendasi PRE-4 |
| E2E-03 | Materi microlearning | Buka SPL-4 → navigasi 7 layar → keluar → buka lagi → lanjut di layar terakhir |
| E2E-04 | Solver + petunjuk | Soal mandiri → jawaban salah tanda → umpan balik SIGN_ERROR → petunjuk 1→3 → benar → skor sesuai aturan |
| E2E-05 | Soal cerita | Tentukan variabel → label tampil → selesaikan → langkah interpretasi |
| E2E-06 | Offline | Buka modul → mode offline → jawab 2 langkah → online → data tersinkron & tampil di dashboard guru |
| E2E-07 | Siklus pemodelan | Soal L1 → tandai diketahui/ditanya → tentukan variabel → susun persamaan terbalik (umpan balik `MODEL_REVERSED`) → perbaiki → selesaikan → tafsirkan → profil literasi guru berubah |
| E2E-08 | Pemodel AI (Claude dimock di E2E) | Guru aktifkan AI → siswa tempel soal → model tampil dengan kalimat sumber → pilih "bantu langkah demi langkah" → selesai → guru menyetujui ke bank kelas → soal muncul di daftar literasi |

## 5. Pengujian Konten

`validate_content.py` gagal (CI merah) bila:
- JSON tidak sesuai skema;
- instruksi > 25 kata atau > 2 kalimat; umpan balik > 15 kata;
- langkah tidak memiliki tepat 3 petunjuk;
- soal cerita tidak diawali `define_variables` / diakhiri `interpret`;
- `expected` suatu langkah tidak konsisten dengan `solution` (diverifikasi SymPy);
- templat generator menghasilkan sistem tanpa solusi tunggal dalam 1.000 sampel acak.

## 6. Uji Pengguna (Usability & Beban Kognitif)

| Aspek | Rencana |
|---|---|
| Peserta | 5–10 siswa SMP kelas 8–9 (termasuk S01 bila bersedia) + 1–2 guru matematika |
| Persetujuan | Izin sekolah + persetujuan orang tua/wali |
| Tugas siswa | (1) Diagnostik, (2) satu modul metode, (3) dua soal mandiri, (4) satu soal cerita |
| Tugas guru | Membuat kelas, menemukan siswa & langkah tersulit, ekspor CSV |
| Metode | *Think-aloud*, observasi, rekam layar (dengan izin) |
| Instrumen literasi | Pretes & postes 10 soal literasi gaya AKM (L1–L3, setara), dikerjakan sebelum dan sesudah ± 2 minggu pemakaian |
| Instrumen | Skala beban kognitif Paas (1–9) per tugas; System Usability Scale (SUS, versi Bahasa Indonesia); wawancara singkat memakai kode K/IL/EL/GL/DS yang sama dengan wawancara awal |
| Metrik | Tingkat penyelesaian tugas, waktu per tugas, jumlah petunjuk level 3, skor Paas, skor SUS |
| Target | Penyelesaian tugas ≥ 80%, Paas rata-rata ≤ 5, SUS ≥ 70, guru menemukan langkah tersulit ≤ 2 menit |

Hasil uji pengguna dibandingkan dengan temuan di [01-RESEARCH-INSIGHTS.md](01-RESEARCH-INSIGHTS.md) untuk memastikan masalah awal (variabel, metode tertukar, macet langkah, instruksi panjang) teratasi.

## 7. Matriks Uji per Fitur

| FR | Unit | Integrasi | E2E | Uji pengguna |
|---|---|---|---|---|
| FR-01/02 Auth & kelas | ✓ | ✓ | E2E-01 | ✓ (guru) |
| FR-03/04 Diagnostik & penyegaran | ✓ | ✓ | E2E-02 | ✓ |
| FR-05/06 Materi & kartu metode | ✓ | ✓ | E2E-03 | ✓ |
| FR-07/08 Solver & petunjuk | ✓ | ✓ | E2E-04 | ✓ |
| FR-09 Grafik | ✓ | — | E2E-03 | ✓ |
| FR-10 Latihan berpola | ✓ | ✓ | E2E-04 | ✓ |
| FR-11 Soal cerita | ✓ | ✓ | E2E-05 | ✓ |
| FR-12/13 Catatan & refleksi | ✓ | ✓ | — | ✓ |
| FR-15/16 Dashboard & ekspor | ✓ | ✓ | E2E-06 | ✓ (guru) |
| FR-17 Offline | ✓ | ✓ | E2E-06 | — |
| FR-20/21/26 Literasi | ✓ | ✓ | E2E-07 | ✓ (pretes–postes) |
| FR-22–25 Pemodel AI | ✓ (MV-01..12) | ✓ + eval set | E2E-08 | ✓ |

## 8. Kriteria Masuk & Keluar

**Masuk pengujian rilis:** semua story sprint berstatus *done*, CI hijau, build staging tersedia.
**Keluar (siap rilis):** tidak ada bug kritis/tinggi, cakupan tes memenuhi target, NFR kinerja tercapai, uji pengguna selesai dan perbaikan prioritas diterapkan.

## 9. Klasifikasi Bug

| Tingkat | Definisi | Contoh |
|---|---|---|
| Kritis | Kebocoran data / aplikasi tidak bisa dipakai | Guru melihat kelas lain |
| Tinggi | Fitur inti salah | Jawaban benar dinilai salah |
| Sedang | Fitur bermasalah, ada jalan lain | Grafik tidak bisa di-zoom |
| Rendah | Kosmetik | Salah ketik |
