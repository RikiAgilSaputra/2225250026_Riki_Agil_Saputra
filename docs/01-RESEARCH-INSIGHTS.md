# 01 — Research Insights: Sintesis Wawancara Beban Kognitif

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| Penyusun | Riki Agil Saputra |
| Sumber | Laporan Hasil Wawancara — siswa S01 |

---

## 1. Metodologi

| Aspek | Keterangan |
|---|---|
| Responden | 1 siswa (kode S01), kelas 9C |
| Tanggal wawancara | 4 November 2026 |
| Durasi | 23 menit 07 detik, direkam dengan persetujuan narasumber |
| Materi | Sistem Persamaan Linear Dua Variabel (SPLDV) |
| Bukti pernah belajar | Buku tulis berisi catatan materi |
| Artefak pemicu | Buku Matematika SMP Kelas 8 (Platinum, Kurikulum 2013), LKS Matematika, soal cerita SPLDV |
| Kerangka pengodean | **K** (konteks), **IL** (*intrinsic load*), **EL** (*extraneous load*), **GL** (*germane load*), **DS** (saran desain) |

### Keterbatasan

- Hanya **satu responden** — temuan bersifat eksploratif, belum dapat digeneralisasi. Validasi lanjutan dilakukan saat uji pengguna (lihat [11-TEST-PLAN.md](11-TEST-PLAN.md)).
- Siswa sudah di kelas 9; sebagian ingatan tentang materi kelas 8 sudah memudar (K03).

---

## 2. Temuan Utama

### 2.1 Konteks Pembelajaran (K)

| Kode | Kutipan (ringkas) | Interpretasi |
|---|---|---|
| K01 | "Sulit... menentukan nilai dari variabel-variabelnya... membuat saya pusing" | Kesulitan menentukan **nilai dan makna** variabel |
| K02 | "Guru menjelaskan... di papan tulis secara abstrak" | Pembelajaran minim representasi konkret/visual |
| K03 | "Saya hanya mengingat namanya saja karena sudah tertimpa materi kelas 9" | Retensi rendah; perlu penyegaran |

### 2.2 Beban Kognitif Intrinsik (IL) — kompleksitas materi

| Kode | Kutipan (ringkas) | Interpretasi |
|---|---|---|
| IL01 | "Sulit menyelesaikan SPLDV... dalam menentukan nilai dari variabel" | Kesulitan inti: proses menyelesaikan SPLDV |
| IL02 | "Paling soal rumus yang sering tertukar" | Langkah antar-metode tertukar |
| IL03 | "Operasi bilangan bulat, operasi persamaan, perpangkatan juga perlu" | **Prasyarat** menambah beban intrinsik |
| IL04 | "Sulit saat menentukan penyelesaian dari suatu SPLDV" | Penguatan IL01 |
| IL05 | "Bingung di variabel-variabelnya sama rumusnya sering tertukar" | Makna variabel + kebingungan metode |

### 2.3 Beban Kognitif Ekstrinsik (EL) — cara penyajian

| Kode | Kutipan (ringkas) | Interpretasi |
|---|---|---|
| EL01 | "Bingung langkah apa yang harus saya lakukan... cara menentukan titik potong" | Tidak ada *scaffolding* langkah |
| EL02 | "Sering tidak fokus... pikiran ke mana-mana" | Atensi mudah terpecah |
| EL03 | "Lebih mudah memahami... dengan koordinat Kartesius" | Representasi visual membantu |
| EL04 | "Lebih paham ketika guru menjelaskan dari konsep dasar secara urut dengan lambat" | Butuh urutan runtut & tempo lambat |
| EL05 | "Lebih paham jika langsung ke persamaannya, instruksi panjang membuat pusing" | Instruksi panjang = beban ekstrinsik |

### 2.4 Beban Kognitif Germane (GL) — strategi belajar yang efektif

| Kode | Kutipan (ringkas) | Interpretasi |
|---|---|---|
| GL01 | "Membuat catatan di buku... terutama soal koordinat Kartesius" | Mencatat sendiri membantu retensi |
| GL02 | "Mengaitkan dengan teori yang sudah saya pelajari sebelumnya" | Mengaitkan pengetahuan lama (skema) |
| GL03 | "Menggunakan contoh soal serupa... untuk menyelesaikan soal lain secara mandiri" | Belajar dari *worked example* |
| GL04 | "Pernah menjelaskan ke teman... dengan gaya saya sendiri" | *Self-explanation / peer teaching* |
| GL05 | "Contoh soal sebelumnya, sama polanya tapi beda angkanya" | Latihan berpola dengan variasi angka |

### 2.5 Saran Desain dari Siswa (DS)

| Kode | Kutipan (ringkas) | Interpretasi |
|---|---|---|
| DS01 | "Opsi metode, contoh soal latihan setelah penjelasan, gambar pembantu koordinat Kartesius" | Pilihan metode + latihan + visual |
| DS02 | "Konsep dasar perlu dijelaskan, misal cara perolehan y = f(x)... bingung saat menentukan penyelesaian" | Konsep dasar fungsi + bantuan saat macet |
| DS03 | "Kalau ada instruksi jangan panjang" | Instruksi ringkas |

---

## 3. Insight Kunci

1. **Masalah inti adalah "variabel tanpa makna".** Siswa bisa memanipulasi simbol tetapi tidak tahu apa yang diwakili *x* dan *y*, terutama di soal cerita. → Variabel harus selalu dikaitkan dengan makna konkret dan diberi penanda visual yang konsisten.
2. **Metode-metode penyelesaian tercampur dalam ingatan.** Substitusi dan eliminasi tidak dibedakan dengan jelas. → Setiap metode butuh "identitas" yang konsisten (nama, warna/ikon, urutan langkah bernomor) dan perbandingan berdampingan.
3. **Siswa macet di tengah proses, bukan di awal.** Mereka tidak tahu langkah selanjutnya. → *Scaffolding* per langkah dengan bantuan bertingkat, bukan sekadar kunci jawaban akhir.
4. **Visual Kartesius adalah jangkar pemahaman.** → Metode grafik dan grafik bantu harus tersedia di mana pun, bukan hanya di satu bab.
5. **Pola > penjelasan panjang.** Siswa belajar dengan meniru pola contoh lalu menerapkannya pada angka lain. → Alur *worked example → fading → mandiri* dengan generator soal.
6. **Prasyarat rapuh.** Kesalahan SPLDV sering berasal dari operasi bilangan bulat/persamaan. → Diagnostik + penyegaran singkat sebelum masuk SPLDV.

---

## 4. Persona

### Persona 1 — Siswa: "Nadia", 14 tahun, kelas 8/9

| Aspek | Deskripsi |
|---|---|
| Perangkat | HP Android kelas menengah-bawah (RAM 3–4 GB), kuota terbatas; sesekali laptop sekolah |
| Tujuan | Bisa mengerjakan soal SPLDV di ulangan tanpa bingung langkah |
| Frustrasi | Variabel membingungkan, rumus tertukar, instruksi panjang, penjelasan terlalu cepat |
| Kebiasaan belajar | Mencatat di buku, meniru contoh soal, belajar dari gambar grafik |
| Kebutuhan | Langkah jelas, bantuan saat macet, contoh soal mirip, visual Kartesius |
| Kutipan | *"Saya lebih paham jika langsung ke persamaannya."* |

### Persona 2 — Guru: "Pak Budi", guru Matematika SMP

| Aspek | Deskripsi |
|---|---|
| Perangkat | Laptop + HP Android |
| Tujuan | Mengetahui siswa mana yang kesulitan dan di langkah mana |
| Frustrasi | Waktu kelas terbatas untuk menjelaskan ulang secara individual |
| Kebutuhan | Ringkasan progres kelas, langkah yang paling sering salah, data yang mudah diekspor |

---

## 5. Matriks Keterlacakan (Temuan → Kebutuhan)

Kode FR mengacu pada [02-PRD.md](02-PRD.md#6-kebutuhan-fungsional).

| Kode temuan | Kebutuhan / fitur | FR |
|---|---|---|
| K01 | Langkah "Tentukan variabel", warna variabel tetap | FR-11, FR-07 |
| K02 | Representasi visual & konkret; data untuk guru | FR-09, FR-15 |
| K03 | Diagnostik + penyegaran prasyarat | FR-03, FR-04 |
| IL01 | Solver terpandu SPLDV | FR-07 |
| IL02 | Kartu metode dengan langkah bernomor konsisten | FR-06 |
| IL03 | Modul penyegaran bilangan bulat, persamaan, perpangkatan | FR-03, FR-04 |
| IL04 | Solver terpandu + latihan bertahap | FR-07, FR-10 |
| IL05 | Makna variabel + perbandingan metode | FR-06, FR-11 |
| EL01 | Petunjuk bertingkat; panduan titik potong di grafik | FR-08, FR-09 |
| EL02 | Microlearning, 1 konsep per layar, tanpa distraksi | FR-05 |
| EL03 | Grafik Kartesius interaktif | FR-09 |
| EL04 | Urutan runtut, navigasi mandiri tanpa auto-advance | FR-05 |
| EL05 | Instruksi ≤ 25 kata, langsung ke persamaan | FR-05, FR-07 |
| GL01 | Catatan pribadi | FR-12 |
| GL02 | Pengingat konsep terkait ("Ingat kembali") | FR-05 |
| GL03 | Worked example → fading → mandiri | FR-10 |
| GL04 | "Jelaskan dengan kata-katamu" | FR-13 |
| GL05 | Generator soal pola sama, angka berbeda | FR-10 |
| DS01 | Pilihan metode, latihan setelah materi, grafik bantu | FR-06, FR-09, FR-10 |
| DS02 | Penjelasan y = f(x) di prasyarat; bantuan saat macet | FR-04, FR-08 |
| DS03 | Instruksi singkat (aturan konten global) | FR-05 (NFR-08) |

### 5.1 Kebutuhan Tambahan dari Pemilik Produk

Selain temuan wawancara, pemilik produk menetapkan dua tujuan tambahan:

| Kebutuhan | Kaitan dengan temuan | FR |
|---|---|---|
| Menumbuhkembangkan **literasi matematika** siswa | Kesulitan memaknai variabel dan menyelesaikan soal cerita (K01, IL01, IL05) merupakan inti literasi: proses *merumuskan* dan *menafsirkan* | FR-20, FR-21, FR-26 |
| **Memodelkan beragam soal cerita** ke model matematika dan menyelesaikannya | Siswa macet saat menentukan langkah (EL01) dan belajar dari contoh berpola (GL03); pemodel memberi contoh model untuk soal apa pun dari buku/PR | FR-22, FR-23, FR-24, FR-25 |

Kerangka lengkap: [13-MATH-LITERACY.md](13-MATH-LITERACY.md), [14-WORD-PROBLEM-MODELER.md](14-WORD-PROBLEM-MODELER.md).
