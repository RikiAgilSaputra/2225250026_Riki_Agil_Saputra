# 15 — Rigorous Mathematical Thinking (RMT): Model Pembelajaran LangkahKu

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 16 November 2026 |
| Sumber | Kinard, J. T. & Kozulin, A. (2008). *Rigorous Mathematical Thinking: Conceptual Formation in the Mathematics Classroom*. Cambridge University Press |
| Terkait | [04-LEARNING-DESIGN.md](04-LEARNING-DESIGN.md) (CLT), [05-CONTENT-SPEC.md](05-CONTENT-SPEC.md), [13-MATH-LITERACY.md](13-MATH-LITERACY.md) |

---

## 1. Mengapa RMT

RMT berangkat dari temuan bahwa kesulitan siswa dalam matematika sering bukan karena kurang pengetahuan matematika. Penyebabnya adalah **fungsi kognitif umum** yang belum terbentuk: menganalisis, merencanakan, membandingkan, dan merefleksikan. Contoh terkenalnya adalah soal "26 domba dan 10 kambing, berapa umur kaptennya?". Banyak siswa langsung menjumlahkan angka tanpa memahami masalahnya.

Gejala yang sama muncul di wawancara siswa LangkahKu ([01](01-RESEARCH-INSIGHTS.md)):

- Siswa tidak tahu langkah berikutnya (EL01).
- Metode sering tertukar (IL02).
- Arti variabel tidak dipahami (K01).

RMT memadukan dua teori:

| Teori | Inti | Wujud di LangkahKu |
|---|---|---|
| **Alat psikologis** (Vygotsky) | Simbol, tabel, garis bilangan, bidang Kartesius, persamaan, dan bahasa matematika adalah *alat berpikir*, bukan sekadar isi pelajaran. Alat ini harus dikuasai lalu "dibatinkan". | Modul RMT-3, blok `table`/`numberline`/`graph`/`eq`, langkah yang memakai alat tersebut |
| **Pengalaman belajar termediasi / MLE** (Feuerstein) | Belajar efektif terjadi bila ada mediator yang menjaga *intensionalitas*, *transendensi*, dan *makna*. | Petunjuk 3 level, kolom `meaning` dan `bridge`, pertanyaan mediasi pada chip fungsi berpikir, refleksi |

**RMT melengkapi CLT, tidak menggantikannya.** Semua aturan CLT (R1–R15, [04 §3](04-LEARNING-DESIGN.md#3-aturan-konten-wajib-dicek-otomatis-bila-memungkinkan)) tetap berlaku. Unsur RMT dibuat singkat dan dilipat agar tidak menambah beban ekstrinsik.

## 2. Tiga Fase RMT → Struktur Aplikasi

| Fase RMT | Arti | Di LangkahKu |
|---|---|---|
| **I. Pengembangan kognitif** | Siswa menguasai alat berpikir umum dan membentuk fungsi kognitif | Tahap baru **Alat Berpikir** (paling awal di jalur): RMT-1 *Membandingkan dengan Teliti*, RMT-2 *Yang Tetap dan Yang Berubah*, RMT-3 *Alat Berpikir & Bukti Logis* |
| **II. Isi sebagai proses** | Konsep dibangun dari pengalaman sehari-hari lewat pola dan hubungan. Alat khusus matematika dikuasai berdasarkan hubungan struktur–fungsinya. | Modul Prasyarat dan Konsep. Setiap layar menyebut fungsi berpikir yang dilatih; blok tabel, grafik, dan garis bilangan diperlakukan sebagai alat. |
| **III. Praktik konstruksi konseptual** | Alat dan fungsi kognitif dipakai bersama untuk membangun konsep | Solver terpandu. Setiap langkah diberi label fungsi berpikir dan diakhiri **bukti logis**. |

Urutan jalur belajar: **Alat Berpikir → Prasyarat → Konsep → Metode → Pemodelan → Literasi → Bank Soal** ([content/path.json](../content/path.json)).

## 3. Kriteria Mediasi (MLE) → Fitur

| Kriteria | Arti singkat | Fitur |
|---|---|---|
| **Intensionalitas & resiprositas** | Mediator sengaja menarik perhatian dan menyesuaikan tugas dengan siswa | Tujuan modul (`objective`) di layar pertama. Petunjuk bertingkat yang dibuka oleh siswa sendiri. *Adaptive fading* ([04 §9](04-LEARNING-DESIGN.md#9-skoring--penguasaan)). |
| **Makna** | Siswa tahu *mengapa* sesuatu dipelajari | Kolom modul `meaning`, ditampilkan sebagai "💬 Mengapa penting" di layar pertama |
| **Transendensi** | Pelajaran dibawa melampaui situasi "di sini dan sekarang" | Kolom modul `bridge`, ditampilkan sebagai "🌉 Jembatan" di akhir modul |
| **Rasa mampu** | Menyoroti mengapa langkah yang benar itu benar | Umpan balik benar menampilkan bentuk jawaban. Bukti logis menunjukkan "✓ memenuhi kedua persamaan". |
| **Refleksi** (*learning activity*, Zuckerman) | Mengenali tujuan dan cara, serta menilai diri | Kartu **Refleksi** di akhir modul: "Apa tujuan langkah-langkahnya?" dan "Bagiku modul ini: mudah, sedang, atau sulit". Refleksi disimpan ke Catatanku. |

## 4. Fungsi Berpikir (Fungsi Kognitif)

Buku membagi fungsi kognitif dalam tiga tingkat (umum, kuantitatif, dan khusus matematika). LangkahKu memakai **10 fungsi** yang paling relevan untuk SPLDV. Id fungsi di kode berbahasa Inggris dan sama di kedua backend (`COGNITIVE_FUNCTIONS`) serta di frontend ([lib/cognitive.ts](../apps/web/src/lib/cognitive.ts)).

| Id | Label | Tingkat RMT | Dilatih oleh (contoh) |
|---|---|---|---|
| `labeling` | Memberi label | 1 | Memilih arti x dan y; mengenali PLDV |
| `comparing` | Membandingkan | 1 | Membaca titik potong; memilih metode |
| `systematic_search` | Mencari secara sistematis | 1 | Menandai diketahui/ditanya; perintah tersirat |
| `encoding` | Menyandikan | 1 | Cerita → persamaan; jawaban → kalimat cerita |
| `conserving_constancy` | Menjaga yang tetap | 2 | Mengolah persamaan tanpa mengubah penyelesaian; menyamakan koefisien |
| `analyzing_integrating` | Mengurai & menyatukan | 2 | Menjumlah/mengurangkan persamaan; menghitung nilai |
| `projecting_relationships` | Memindahkan hubungan | 3 | Substitusi bentuk/nilai ke persamaan lain |
| `analogical_thinking` | Berpikir analogi | 3 | "Ulangi eliminasi untuk variabel lain"; soal baru mirip soal lama |
| `functional_relationship` | Hubungan fungsional | 3 | Tabel x–y; titik potong sumbu pada metode grafik |
| `logical_evidence` | Bukti logis | 3 | Langkah bukti logis; memeriksa jawaban ke cerita |

Penanda fungsi berpikir:

- **Layar materi** memakai kolom `cognitive_function` (wajib, diperiksa `validate_content.py`).
- **Langkah buatan generator** mendapat penanda otomatis dari peran langkahnya (`STEP_COGNITIVE` di `step_builder.ts` / `step_builder.py`).
- **Langkah yang ditulis tangan** boleh menyebut `cognitive_function`. Jika tidak, nilai bawaannya diambil dari jenis pengecekan (`CHECK_COGNITIVE`).

Di layar, fungsi berpikir tampil sebagai **chip kecil** "🧠 Membandingkan". Jika diketuk, chip memperlihatkan arti fungsi dan pertanyaan mediasi, misalnya "Tanya dirimu: Ukuran apa yang kubandingkan?". Penjelasan ini dilipat secara bawaan, sesuai prinsip *coherence* dan *redundancy* dalam CLT.

## 5. Kekakuan (Rigor) dan Bukti Logis

RMT menuntut jawaban yang dibuktikan, bukan ditebak. Karena itu:

1. **Setiap soal SPLDV non-cerita diakhiri langkah bukti logis.** Siswa memasukkan (x, y) ke persamaan (2) dan menghitung ruas kiri. Persamaan (2) dipilih karena metode campuran dan substitusi biasanya memakai persamaan (1) untuk mencari nilai kedua.
   - Instruksinya ≤ 25 kata.
   - Langkah ini punya 3 petunjuk.
   - Pengecekannya `value`.
   - Fungsi berpikirnya `logical_evidence`.
2. **Soal cerita** sudah memiliki langkah "Periksa ke cerita" (tahap 6 siklus pemodelan). Langkah ini juga diberi penanda `logical_evidence`, sehingga tidak ada langkah ganda.
3. Pada mode **melengkapi** (*fading*), langkah bukti logis **selalu terbuka**. Jumlah langkah kosong (`completion_blanks`) hanya dihitung dari langkah penyelesaian.
4. Ketelitian bahasa: istilah fungsi berpikir dipakai konsisten di layar, langkah, petunjuk, dan profil, sesuai gagasan RMT tentang *bahasa matematika sebagai alat*.

## 6. Alat Khusus Matematika (Struktur → Fungsi)

| Alat | Struktur | Fungsi | Tempat |
|---|---|---|---|
| Sistem bilangan / nilai tempat | Posisi dengan nilai berpangkat basis | Membandingkan dan mengurutkan besaran | PRE-1 |
| Garis bilangan | Garis yang dibagi ke ruas-ruas sama besar | Membandingkan, menghitung jarak dan selisih | PRE-1, RMT-3 |
| Tabel | Kolom (kelompok) × baris (pasangan) | Mengelompokkan data dan membentuk hubungan x → y | PRE-4, RMT-3, metode grafik |
| Bidang Kartesius | Dua garis bilangan tegak lurus | Memasangkan nilai dua variabel, melihat hubungan fungsional dan titik potong | PRE-3, SPL-3, RMT-3 |
| Persamaan | Ruas kiri = ruas kanan | Menyatakan kesetaraan besaran; diolah tanpa merusak kesetaraan | PRE-2, SPL-1..6 |
| Bahasa matematika | Simbol + istilah + aturan urutan operasi | Menyatakan dan membangun pikiran matematis | Semua modul, chip fungsi berpikir |

## 7. Profil Fungsi Berpikir

Profil ini menghitung nilai rata-rata langkah (0–100) untuk tiap fungsi berpikir dari soal yang sudah selesai. Langkah yang sudah terisi (contoh) tidak dihitung. Profil dihitung dari `attempts.problem_snapshot`, jadi **tidak perlu migrasi database**.

- **Siswa**: halaman Kemajuan → "Profil fungsi berpikir" (`GET /progress/summary` → `thinking`).
- **Guru**: Dashboard → "Profil fungsi berpikir kelas" (`GET /teacher/overview` → `thinking`).
- Nilai `null` (ditampilkan "–") berarti fungsi itu belum dilatih.

Guru dapat memakai profil ini untuk melihat apakah kesulitan kelas ada pada konsep SPLDV atau pada fungsi berpikir umumnya. Contohnya: nilai `comparing` rendah, tetapi `analyzing_integrating` tinggi.

## 8. Aturan Konten Tambahan (R16–R20)

| No | Aturan | Pemeriksaan |
|---|---|---|
| R16 | Setiap layar materi punya `cognitive_function` dari daftar §4 | `validate_content.py` |
| R17 | Setiap modul punya `meaning` (mengapa penting) dan `bridge` (jembatan), masing-masing ≤ 2 kalimat dan ≤ 25 kata | `validate_content.py` |
| R18 | Setiap langkah soal punya `cognitive_function` yang dikenal (diberikan otomatis bila tidak ditulis) | `validate_content.py`, tes `rmt.test.ts` / `test_rmt.py` |
| R19 | Soal SPLDV non-cerita diakhiri langkah bukti logis; soal cerita diakhiri pemeriksaan ke cerita | Generator langkah, tes |
| R20 | Petunjuk level 1 sebaiknya berupa arah atau pertanyaan mediasi ("Apa yang tetap?"), bukan jawaban | Review manual |

## 8a. RMT di Tiga Bagian Aplikasi

| Bagian | Gagasan RMT | Wujud |
|---|---|---|
| **Belajar & Literasi** | Tiga fase RMT | Setiap tahap di `content/path.json` punya `rmt_phase` (1–3) yang tampil sebagai label "Fase I/II/III". Penjelasan singkat ketiga fase ada di atas jalur. |
| | Siklus penyelidikan: representasi → manipulasi → validasi | Enam langkah siklus pemodelan dikelompokkan ke tiga tahap itu. Setiap langkah menyebut fungsi berpikirnya. |
| | Mendefinisikan masalah (soal "umur nakhoda") | Layar RMT-1 *cukupkah-informasi* dan satu soal: angka di soal tidak selalu bisa dipakai; kadang soal tidak bisa dijawab. |
| **Latihan** | Aktivitas belajar (orientasi, rencana, pelaksanaan, refleksi) | Empat langkah aktivitas tampil di atas pilihan latihan. |
| | Zona perkembangan proksimal: latih fungsi yang sedang tumbuh | Kartu rekomendasi memilih fungsi berpikir terlemah (skor < 80) dari profil, lalu menyarankan jenis latihan yang melatihnya (`TEMPLATE_FUNCTIONS`, `recommendPractice` di `lib/cognitive.ts`). |
| | Elaborasi lewat kategori kognitif dan evaluasi diri | Di akhir soal, setiap fungsi berpikir diberi status *lancar* (benar sekali coba), *berkembang* (benar setelah salah), atau *perlu dilatih* (jawaban dibuka). Kotak penjelasan menjadi refleksi strategi. |
| **Pemodel AI** | Siklus penyelidikan | Penanda alur: Orientasi → Representasi → Manipulasi → Validasi. Aplikasi hanya membantu sampai representasi. Manipulasi dan validasi (bukti logis) dikerjakan siswa di solver. |
| | Resiprositas dan membandingkan | Sebelum model ditampilkan, siswa diajak menebak arti x dan y. Tebakannya tidak dikirim ke server atau AI. Setelah itu, siswa membandingkan tebakannya dengan model aplikasi. |
| | Contoh kerja (*worked example*) tetap tersedia | Tombol "Tunjukkan penyelesaian lengkap" selalu terlihat, baik di kartu "Coba dulu" maupun untuk soal persamaan hasil pindai. Tombol ini menampilkan semua langkah dari tahap awal sampai bukti logis, selama guru mengizinkan (`allow_full_solution`). |

## 8b. Gambar Benda Konkret

Gambar benda menjembatani konsep sehari-hari ke konsep ilmiah (Vygotsky) dan menjawab temuan K02 (guru terlalu abstrak). Logikanya ada di `apps/web/src/lib/concrete.ts`, tampilannya di `components/ConcreteVisual.tsx`.

- **Pemilihan ikon:** ikon dipilih dari arti variabel, misalnya "harga 1 buku" menjadi 📘 dan "banyak ayam" menjadi 🐔. Bila tidak ada ikon yang cocok, dipakai ubin x biru dan y oranye (aturan warna CLT).
- **Arti koefisien:**
  - Untuk **nilai per benda** ("harga 1 buku"), 2x digambar sebagai dua buku.
  - Untuk **banyak benda** ("banyak ayam"), 2x digambar sebagai "2 × 🐔". Contohnya kaki ayam: angka 2 adalah banyak kaki tiap ekor, bukan dua ekor ayam.
- **Urutan tampil di solver soal cerita**, supaya jawaban tidak terbocorkan:
  1. Sebelum siswa memilih variabel: hanya daftar benda, tanpa x/y.
  2. Setelah memilih variabel: benda diberi label x/y.
  3. Setelah persamaan ditulis: gambar persamaan.
- **Tempat:**
  - **Solver** (Latihan dan soal di Belajar & Literasi). Soal tanpa cerita memakai ubin x/y, dengan panel tertutup secara bawaan.
  - **Pemodel AI:** daftar benda di kartu "Coba dulu", dan gambar di bawah setiap persamaan model. Persamaan hasil pindai memakai ubin.
  - **Materi:** blok `concrete` di layar SPL-1 *kalimat-ke-pldv*, RMT-3 *alat-persamaan*, dan MAT-4 *contoh-model*. Blok `vars` kini juga menampilkan ikon benda.

### Grafik dan gambar benda berdampingan

Komponen `components/ConcreteGraph.tsx` menaruh grafik berdampingan dengan benda yang dibicarakan soal. Di layar sempit, grafik dan benda tersusun bertumpuk.

- **Sumbu berikon:** setiap sumbu diberi ikon bendanya, misalnya x → 🍲 bakso dan y ↑ 🍹 es jeruk.
- **Garis berpasangan dengan gambar:** setiap garis berwarna dipasangkan dengan gambar benda dari persamaannya.
- **Arti titik potong:** keterangan di bawahnya menjelaskan bahwa titik potong adalah benda x dan y yang cocok untuk kedua kalimat sekaligus. Ini hubungan struktur–fungsi tanpa membocorkan jawaban.
- **Skala grafik soal cerita:** grafik hanya menampilkan kuadran I, karena harga dan banyak benda tidak negatif. Setiap sumbu punya skala sendiri dengan langkah 1/2/5 × 10ⁿ dan label singkat seperti "5 rb" (`lib/axis.ts`).
- **Grafik soal tanpa cerita** tetap memakai skala bersama −n…n seperti sebelumnya.
- **Tempat:**
  - **Solver:** kartu "Grafik dan gambar benda", di kolom utama untuk soal cerita.
  - **Pemodel AI:** tombol "📈 Lihat grafik dan gambar benda" pada model, dan "📈 Lihat grafik" pada persamaan hasil pindai.
  - **Materi:** blok `concrete` dengan `"graph": true` (MAT-4 *contoh-model*).

## 9. Batasan

- Program *Instrumental Enrichment* (Feuerstein) berhak cipta. Tugas di modul RMT-1..3 adalah **tugas asli** yang mengikuti gagasan yang sama (membandingkan, perintah tersirat, yang tetap dan berubah, bukti logis), bukan salinan halaman IE.
- Dialog mediasi panjang seperti di buku diringkas menjadi petunjuk bertingkat dan pertanyaan mediasi, mengikuti batas kata CLT.
- Efek RMT terhadap hasil belajar belum diuji pada pengguna LangkahKu. Rencana evaluasinya: bandingkan profil fungsi berpikir dan skor modul sebelum dan sesudah tahap Alat Berpikir ([11-TEST-PLAN.md](11-TEST-PLAN.md)).
