# 05 — Content Specification: Peta Materi & Skema Konten

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| Acuan | [04-LEARNING-DESIGN.md](04-LEARNING-DESIGN.md) |

Konten disimpan sebagai file **JSON** di folder `content/` (sumber kebenaran), divalidasi dengan JSON Schema, lalu dimuat ke database oleh skrip `seed_content.py`. Konten **tidak** ditulis langsung di komponen React.

---

## 1. Peta Materi

### 1.1 Penyegaran Prasyarat (`PRE`)

| ID | Submodul | Isi inti | Layar | Soal |
|---|---|---|---|---|
| PRE-1 | Operasi bilangan bulat | Penjumlahan/pengurangan bilangan negatif, perkalian tanda, perpangkatan sederhana (a², kuadrat bilangan negatif) | 5 | 3 |
| PRE-2 | Persamaan linear satu variabel | Kedua ruas dioperasikan sama; memindahkan suku (tanda berubah); menyelesaikan ax + b = c | 5 | 3 |
| PRE-3 | Koordinat Kartesius | Sumbu x & y, kuadran, membaca & menempatkan titik (x, y) | 4 | 3 |
| PRE-4 | Fungsi y = f(x) | Mengganti x untuk memperoleh y; tabel x–y; dari tabel ke grafik garis (DS02) | 5 | 3 |

### 1.2 Modul SPLDV (`SPL`)

| ID | Modul | Tujuan pembelajaran | Pola soal |
|---|---|---|---|
| SPL-1 | PLDV & makna variabel | Mengenali PLDV, menyatakan makna x dan y dari situasi | Identifikasi PLDV; menerjemahkan kalimat ke PLDV |
| SPL-2 | Konsep SPLDV | Memahami penyelesaian SPLDV = pasangan (x, y) yang memenuhi kedua persamaan | Cek apakah (x, y) penyelesaian |
| SPL-3 | Metode Grafik | Menentukan penyelesaian dari titik potong dua garis | Gambar & baca titik potong; kasus sejajar (tidak ada penyelesaian) |
| SPL-4 | Metode Substitusi | Menyelesaikan SPLDV dengan substitusi | A: salah satu koefisien = 1; B: perlu membagi |
| SPL-5 | Metode Eliminasi | Menyelesaikan SPLDV dengan eliminasi | A: koefisien sudah sama; B: satu persamaan dikalikan; C: keduanya dikalikan |
| SPL-6 | Metode Campuran | Eliminasi lalu substitusi | A: bentuk standar |
| SPL-7 | Soal cerita & siklus pemodelan | Memodelkan masalah sehari-hari menjadi SPLDV dan menafsirkan hasil | Harga barang; umur; keliling persegi panjang; jumlah kaki hewan |

### 1.2b Materi Lengkap SPLDV (`MAT`, level `MATERI`, tampil paling atas di halaman Literasi)

Diadaptasi dari *Buku Ajar Matematika Kelas VIII Semester 1* (bab SPLDV) dan *BSE Matematika SMP Kelas VIII Bab 4*. File: `content/modules/materi.json`.

| ID | Modul | Isi layar | Latihan |
|---|---|---|---|
| MAT-1 | Mengenal PLDV | Definisi PLDV, bentuk umum ax + by = c, variabel, koefisien, konstanta (blok `anatomy`), bukan PLDV, penyelesaian PLDV & grafiknya | 7 langkah identifikasi |
| MAT-2 | Mengenal SPLDV | Definisi SPLDV, penyelesaian memenuhi kedua persamaan, HP, berpotongan/sejajar/berimpit, empat metode | 6 langkah (pilih SPLDV, cek pasangan, banyak penyelesaian) |
| MAT-3 | Langkah Metode Penyelesaian | Langkah grafik, substitusi, eliminasi + contoh, campuran, persamaan berpecahan (kali KPK), memeriksa jawaban | Contoh tiap metode, lengkapi, SPLDV berpecahan, 2 soal mandiri, soal acak |
| MAT-4 | Dari Soal Cerita ke Model | 4 tahap (misalkan, modelkan, selesaikan, simpulkan), tabel kalimat → model, contoh pensil–buku, jarak–waktu, periksa kewajaran | Latih menerjemahkan + 8 soal cerita (L1–L2), soal cerita acak |

Blok konten baru: `definition` (istilah + arti), `anatomy` (persamaan berlabel variabel/koefisien/konstanta, `focus` meredupkan bagian lain), `steps` (daftar langkah bernomor), `eq` (persamaan dengan pecahan/sistem; `lines` untuk baris pengerjaan). Modul boleh memiliki `source` (sumber adaptasi) yang tampil di layar pertama.

### 1.2a Jalur Literasi (`LIT`)

| ID | Level | Isi | Jumlah soal minimal |
|---|---|---|---|
| LIT-1 | L1 Langsung | Soal cerita teks lengkap, beragam konteks | 10 |
| LIT-2 | L2 Representasi | Tabel, struk, gambar, informasi berlebih, pertanyaan lanjutan | 10 |
| LIT-3 | L3 Penalaran | Keputusan/perbandingan, evaluasi klaim, kasus tanpa penyelesaian tunggal | 10 |

Bank konteks & format: [13-MATH-LITERACY.md](13-MATH-LITERACY.md).

### 1.3 Tes Diagnostik (`DIAG`)

| No | Topik | Contoh soal |
|---|---|---|
| 1–2 | Bilangan bulat | −7 + 3 = ...; (−4) × (−3) = ... |
| 3 | Perpangkatan | (−3)² = ... |
| 4–5 | Persamaan linear 1 variabel | 3x + 5 = 20, x = ...; 2x − 7 = −1 |
| 6 | Memindahkan suku | Ubah 2x + y = 9 menjadi y = ... |
| 7–8 | Koordinat Kartesius | Titik A ada di kuadran ...; koordinat titik pada gambar |
| 9–10 | Fungsi | Jika y = 2x − 1 dan x = 3, maka y = ...; lengkapi tabel x–y |

Ambang: topik "perlu diulang" jika benar < 50% pada topik tersebut.

---

## 2. Struktur Folder Konten

```
content/
├── schema/
│   ├── lesson.schema.json
│   ├── problem.schema.json
│   └── problem-template.schema.json
├── diagnostic/
│   └── diagnostic-v1.json
├── prerequisite/
│   ├── PRE-1-integers.json
│   └── ...
└── spldv/
    ├── SPL-4-substitution/
    │   ├── lesson.json
    │   ├── method-card.json
    │   ├── worked-A.json
    │   └── template-A.json
    └── ...
```

---

## 3. Skema Lesson (layar materi)

```json
{
  "id": "SPL-4",
  "title": "Metode Substitusi",
  "objective": "Kamu bisa menyelesaikan SPLDV dengan cara memasukkan satu persamaan ke persamaan lain.",
  "recall": [{ "label": "Memindahkan suku", "ref": "PRE-2/screen-3" }],
  "screens": [
    {
      "id": "SPL-4-s1",
      "concept": "substitusi-artinya-memasukkan",
      "instruction": "Substitusi artinya memasukkan. Kita masukkan y dari satu persamaan ke persamaan lain.",
      "blocks": [
        { "type": "math", "tex": "y = 7 - 2x" },
        { "type": "arrow", "label": "masukkan ke" },
        { "type": "math", "tex": "3x + {\\color{var-y}y} = 10" }
      ]
    }
  ]
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | Unik, format `PRE-n` / `SPL-n` |
| `objective` | string | 1 kalimat |
| `recall` | array | Opsional; tautan "Ingat kembali" (GL02) |
| `screens[].concept` | string | **Tepat satu** konsep (R3) |
| `screens[].instruction` | string | ≤ 25 kata, ≤ 2 kalimat (R1) |
| `screens[].blocks[].type` | enum | `text`, `math`, `graph`, `table`, `arrow`, `image`, `callout` |

---

## 4. Skema Problem (soal terpandu)

```json
{
  "id": "SPL-4-A-worked-1",
  "lesson_id": "SPL-4",
  "pattern": "SPL-4-A",
  "mode": "worked",
  "method": "substitution",
  "context": null,
  "system": ["2*x + y = 7", "3*x + y = 10"],
  "solution": { "x": 3, "y": 1 },
  "steps": [
    {
      "id": "s1",
      "instruction": "Ubah persamaan (1) menjadi y = ...",
      "expected": "y = 7 - 2*x",
      "check": "equation_equivalent",
      "prefilled": true,
      "hints": [
        "Tujuannya: y sendirian di ruas kiri.",
        "Pindahkan 2x ke ruas kanan. Tandanya berubah.",
        "2x + y = 7 → y = 7 − 2x"
      ],
      "feedback": { "SIGN_ERROR": "Periksa tanda saat memindahkan 2x." }
    },
    {
      "id": "s2",
      "instruction": "Masukkan y = 7 − 2x ke persamaan (2).",
      "expected": "3*x + (7 - 2*x) = 10",
      "check": "equation_equivalent",
      "prefilled": true,
      "hints": ["...", "...", "..."]
    },
    {
      "id": "s3",
      "instruction": "Tentukan nilai x.",
      "expected": "x = 3",
      "check": "value",
      "prefilled": false,
      "hints": ["...", "...", "..."]
    },
    {
      "id": "s4",
      "instruction": "Masukkan x = 3 ke y = 7 − 2x. Tentukan y.",
      "expected": "y = 1",
      "check": "value",
      "prefilled": false,
      "hints": ["...", "...", "..."]
    }
  ]
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `mode` | enum | `worked`, `completion`, `independent`, `diagnostic` |
| `method` | enum | `graph`, `substitution`, `elimination`, `mixed`, `null` |
| `context` | object \| null | Untuk soal cerita: `{ "story": "...", "variables": { "x": "harga 1 buku", "y": "harga 1 pensil" }, "unit": "rupiah" }` |
| `system` | string[2] | Notasi SymPy (`*` eksplisit) |
| `steps[].check` | enum | `equation_equivalent`, `expression_equivalent`, `value`, `point`, `choice`, `define_variables`, `interpret` |
| `steps[].hints` | string[3] | Tepat 3 (R5) |
| `steps[].prefilled` | bool | Untuk fading: `true` = langkah ditampilkan terisi |

Aturan tambahan soal cerita (R7): langkah pertama `check: "define_variables"`, langkah terakhir `check: "interpret"`.

### 4.1 Field Literasi (wajib untuk soal cerita)

```json
{
  "source": "content",
  "story": {
    "text": "Di koperasi sekolah, Nadia membeli 2 buku dan 3 pensil seharga Rp19.000 ...",
    "representations": [{ "type": "receipt", "rows": [["Buku", "2"], ["Pensil", "3"], ["Total", "Rp19.000"]] }],
    "spans": {
      "known": [[25, 63], [70, 110]],
      "asked": [[112, 150]],
      "irrelevant": [[0, 24]]
    }
  },
  "literacy": {
    "level": "L2",
    "context_category": "sosial_budaya",
    "representation": "receipt",
    "akm_cognitive": "penerapan",
    "item_format": "isian"
  },
  "steps": [
    { "id": "s0", "modeling_stage": 1, "check": "highlight_spans", "...": "..." },
    { "id": "s1", "modeling_stage": 2, "check": "define_variables", "...": "..." },
    { "id": "s2", "modeling_stage": 3, "check": "equation_equivalent", "...": "..." }
  ]
}
```

| Field | Nilai |
|---|---|
| `source` | `content` (bank resmi), `ai` (hasil pemodel), `teacher` (soal AI yang disetujui guru), `student_posed` |
| `story.representations[].type` | `text`, `table`, `receipt`, `image`, `graph` |
| `literacy.level` | `L1`, `L2`, `L3` |
| `literacy.context_category` | `personal`, `sosial_budaya`, `pekerjaan`, `saintifik`, `geometri`, `lainnya` |
| `literacy.akm_cognitive` | `pemahaman`, `penerapan`, `penalaran` |
| `literacy.item_format` | `pilihan_ganda`, `pilihan_ganda_kompleks`, `menjodohkan`, `isian`, `uraian` |
| `steps[].modeling_stage` | 1–7 (lihat [13 §3](13-MATH-LITERACY.md#3-siklus-pemodelan-di-langkahku)) |

Nilai `check` tambahan untuk literasi: `highlight_spans`, `multi_choice`, `match`, `explanation`, `claim_evaluation`, `reasonableness`.

---

## 5. Skema Template Generator (GL05)

```json
{
  "id": "SPL-5-B",
  "method": "elimination",
  "description": "Satu persamaan perlu dikalikan agar koefisien y sama",
  "params": {
    "x": { "range": [-6, 6], "exclude": [0] },
    "y": { "range": [-6, 6], "exclude": [0] },
    "a1": { "range": [1, 5] }, "b1": { "const": 1 },
    "a2": { "range": [1, 5] }, "b2": { "range": [2, 4] }
  },
  "system": ["a1*x + b1*y = a1*X + b1*Y", "a2*x + b2*y = a2*X + b2*Y"],
  "constraints": ["a1*b2 - a2*b1 != 0", "a1 != a2"],
  "steps_from": "SPL-5-B-worked-1"
}
```

Generator (`services/problem_generator.py`):
1. Pilih nilai solusi (X, Y) lalu koefisien → hitung konstanta (solusi dijamin bilangan bulat).
2. Cek `constraints` (determinan ≠ 0 → solusi tunggal).
3. Bangun langkah dengan menyalin struktur `steps_from` dan mengganti angka.
4. Simpan `seed` agar soal dapat direproduksi (untuk analitik guru).

---

## 6. Proses Produksi Konten

1. Penulis menyusun JSON mengikuti skema.
2. `python scripts/validate_content.py` → cek skema, jumlah kata instruksi, jumlah petunjuk, dan **semua `expected` diverifikasi SymPy terhadap `solution`**.
3. Review oleh guru matematika (kebenaran & bahasa).
4. Merge → CI menjalankan validasi → `seed_content.py` memuat ke database.

### Checklist review konten

- [ ] Satu konsep per layar
- [ ] Instruksi ≤ 25 kata, umpan balik ≤ 15 kata
- [ ] 3 level petunjuk per langkah, level 3 berisi contoh pengerjaan
- [ ] Notasi konsisten: (1), (2) untuk penomoran persamaan; − (minus) bukan tanda hubung
- [ ] Soal cerita memakai konteks dekat dengan siswa (jajan, alat tulis, umur, hewan ternak)
- [ ] Angka di soal tingkat dasar ≤ 2 digit, solusi bilangan bulat
