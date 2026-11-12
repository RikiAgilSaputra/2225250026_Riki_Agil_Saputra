# 03 — User Stories & Kriteria Penerimaan

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 9 November 2026 |
| Acuan | [02-PRD.md](02-PRD.md) |

Format: *Sebagai [peran], saya ingin [tujuan], agar [manfaat].*
Kriteria penerimaan memakai format **Given / When / Then** (Diberikan / Ketika / Maka).
Estimasi dalam *story points* (SP, skala Fibonacci).

---

## Ringkasan Epik

| Epik | Nama | FR | Prioritas | Total SP |
|---|---|---|---|---|
| E1 | Akun & Kelas | FR-01, FR-02, FR-18 | M | 18 |
| E2 | Diagnostik & Penyegaran | FR-03, FR-04 | M | 16 |
| E3 | Materi SPLDV | FR-05, FR-06, FR-14 | M | 18 |
| E4 | Solver Terpandu | FR-07, FR-08, FR-11 | M | 26 |
| E5 | Grafik Interaktif | FR-09 | M | 13 |
| E6 | Latihan Berpola | FR-10 | M | 13 |
| E7 | Refleksi & Catatan | FR-12, FR-13 | S | 8 |
| E8 | Dashboard Guru | FR-15, FR-16 | M/S | 21 |
| E9 | Offline & Aksesibilitas | FR-17, FR-19 | S/C | 13 |
| E10 | Literasi Matematika | FR-20, FR-21, FR-26 | M/S | 26 |
| E11 | Pemodel Soal Cerita (AI) | FR-22, FR-23, FR-24, FR-25 | M/S | 34 |

---

## E1 — Akun & Kelas

### US-01 Login (FR-01) · M · 3 SP
Sebagai **siswa**, saya ingin masuk dengan username dan password, agar progres belajar saya tersimpan.

- **Given** akun siswa aktif, **when** saya memasukkan username & password yang benar, **then** saya diarahkan ke Beranda dalam ≤ 2 detik.
- **Given** password salah, **when** saya menekan Masuk, **then** muncul pesan "Username atau password salah" tanpa menyebut mana yang salah.
- **Given** 5 kali gagal dalam 1 menit, **when** saya mencoba lagi, **then** login diblokir sementara 1 menit.
- Sesi tetap aktif di Android sampai siswa keluar (refresh token 30 hari).

### US-02 Gabung kelas dengan kode (FR-02) · M · 3 SP
Sebagai **siswa**, saya ingin bergabung ke kelas dengan kode dari guru, agar guru dapat melihat progres saya.

- **Given** kode kelas valid, **when** saya mengisi nama panggilan, username, password, dan kode, **then** akun dibuat dan terdaftar di kelas tersebut.
- **Given** kode tidak valid/kedaluwarsa, **then** muncul pesan "Kode kelas tidak ditemukan. Tanyakan ke gurumu."
- Username unik; password minimal 6 karakter.

### US-03 Guru membuat kelas (FR-02) · M · 3 SP
Sebagai **guru**, saya ingin membuat kelas dan mendapatkan kode kelas, agar siswa dapat bergabung.

- **When** saya mengisi nama kelas dan jenjang, **then** kelas dibuat dengan kode 6 karakter unik (huruf kapital & angka, tanpa O/0/I/1).
- Guru dapat menonaktifkan atau membuat ulang kode kelas.

### US-04 Guru membuat akun siswa massal (FR-02) · S · 5 SP
Sebagai **guru**, saya ingin mengunggah daftar siswa (CSV), agar tidak perlu mendaftarkan satu per satu.

- **Given** CSV berkolom `nama_panggilan`, **when** diunggah, **then** sistem membuat username & password sementara, lalu menampilkan/unduh kartu login yang dapat dicetak.
- Baris yang tidak valid dilaporkan tanpa membatalkan baris lain.

### US-05 Reset password siswa (FR-02) · M · 2 SP
Sebagai **guru**, saya ingin mereset password siswa di kelas saya, agar siswa yang lupa password dapat masuk kembali.

- Password sementara ditampilkan sekali; siswa diminta menggantinya saat login berikutnya.

### US-06 Verifikasi guru (FR-18) · S · 2 SP
Sebagai **admin**, saya ingin menyetujui pendaftaran guru, agar hanya guru sungguhan yang dapat melihat data siswa.

- Akun guru berstatus `pending` tidak dapat membuat kelas sampai disetujui.

---

## E2 — Diagnostik & Penyegaran

### US-07 Mengerjakan tes diagnostik (FR-03) · M · 5 SP
Sebagai **siswa**, saya ingin mengerjakan tes singkat di awal, agar saya tahu materi prasyarat mana yang perlu diulang.

- Tes berisi 10 soal, satu soal per layar, tanpa batas waktu.
- **When** selesai, **then** muncul hasil per topik (✓ kuat / ! perlu diulang) dan tombol menuju modul penyegaran yang direkomendasikan.
- Tes dapat diulang; hasil terbaru dan riwayat tersimpan.

### US-08 Modul penyegaran (FR-04) · M · 8 SP
Sebagai **siswa**, saya ingin mengulang materi prasyarat secara singkat, agar saya siap belajar SPLDV.

- Tersedia 4 submodul: bilangan bulat, persamaan linear satu variabel, koordinat Kartesius, fungsi y = f(x).
- Tiap submodul ≤ 5 layar materi + 3 soal latihan.
- Submodul fungsi menjelaskan cara memperoleh y bila x diketahui dengan tabel x–y dan grafik (DS02).

### US-09 Pengingat prasyarat kontekstual (FR-05) · S · 3 SP
Sebagai **siswa**, saya ingin melihat kotak "Ingat kembali" saat materi memakai konsep lama, agar saya bisa mengaitkannya (GL02).

- Kotak dapat dibuka/tutup dan menautkan ke layar penyegaran terkait tanpa kehilangan posisi materi.

---

## E3 — Materi SPLDV

### US-10 Belajar per layar (FR-05) · M · 5 SP
Sebagai **siswa**, saya ingin materi disajikan sedikit demi sedikit, agar saya tidak kewalahan.

- Satu konsep per layar; instruksi ≤ 25 kata.
- Tombol **Kembali** dan **Lanjut** selalu terlihat; tidak ada perpindahan otomatis.
- Indikator posisi (mis. "3 / 7") terlihat.
- Posisi terakhir tersimpan; saat dibuka lagi, siswa melanjutkan dari layar terakhir.

### US-11 Kartu metode (FR-06) · M · 5 SP
Sebagai **siswa**, saya ingin melihat kartu ringkas tiap metode, agar saya tidak tertukar langkah antar-metode.

- Kartu memuat: nama, ikon, warna identitas, kapan cocok dipakai, dan ≤ 4 langkah bernomor.
- Kartu dapat dibuka dari dalam soal (tombol "Lihat langkah metode").
- Tersedia tabel perbandingan Grafik vs Substitusi vs Eliminasi vs Campuran.

### US-12 Memilih metode (FR-06) · M · 3 SP
Sebagai **siswa**, saya ingin memilih metode sebelum mengerjakan soal mandiri, agar saya bisa memakai cara yang paling saya pahami (DS01).

- Soal mandiri menampilkan pilihan metode; langkah solver menyesuaikan metode terpilih.

### US-13 Peta progres (FR-14) · M · 5 SP
Sebagai **siswa**, saya ingin melihat peta modul dan status saya, agar saya tahu harus belajar apa berikutnya.

- Status: belum dimulai / sedang berjalan / selesai, dengan skor terbaik.
- Modul berikutnya disarankan, tetapi siswa boleh membuka modul mana pun (tidak dikunci).

---

## E4 — Solver Terpandu

### US-14 Mengerjakan soal per langkah (FR-07) · M · 13 SP
Sebagai **siswa**, saya ingin mengerjakan soal langkah demi langkah dan langsung tahu benar/salah, agar saya tidak tersesat di tengah jalan (EL01).

- Langkah ditampilkan berurutan; langkah berikutnya terbuka setelah langkah sekarang benar atau siswa memilih "Tampilkan jawaban langkah ini".
- Input mendukung keyboard matematika sederhana (angka, x, y, +, −, =, pecahan, kurung).
- **Given** jawaban setara secara matematis (mis. `2x + y = 5` dan `y = 5 - 2x`), **then** dinilai benar.
- **Given** jawaban salah tanda, **then** umpan balik: "Periksa tanda saat memindahkan suku ke ruas lain."
- Umpan balik maks. 15 kata dan muncul tepat di bawah kolom input.

### US-15 Petunjuk bertingkat (FR-08) · M · 5 SP
Sebagai **siswa**, saya ingin meminta petunjuk bertahap ketika macet, agar saya tetap berpikir sendiri sebelum melihat contoh.

- Tombol "Petunjuk" membuka level 1; tombol "Petunjuk lagi" membuka level 2, lalu level 3.
- Level petunjuk yang dipakai dicatat dan memengaruhi skor (level 1: −0, level 2: −25%, level 3: −50% untuk langkah tersebut).
- Skor tidak pernah ditampilkan sebagai hukuman; pesan bernada positif.

### US-16 Tentukan variabel pada soal cerita (FR-11) · M · 8 SP
Sebagai **siswa**, saya ingin menentukan arti x dan y di awal soal cerita, agar saya tidak bingung apa yang dicari (K01).

- Langkah pertama soal cerita: memilih makna x dan y dari opsi (atau mengetik bebas untuk tingkat lanjut).
- Setelah benar, label "x = harga 1 buku" (biru) dan "y = harga 1 pensil" (oranye) menempel di atas soal.
- Langkah terakhir: menafsirkan jawaban kembali ke konteks ("Jadi, harga 1 buku Rp4.000").

---

## E5 — Grafik Interaktif

### US-17 Menggambar garis dari persamaan (FR-09) · M · 8 SP
Sebagai **siswa**, saya ingin melihat garis dari persamaan, agar saya paham SPLDV secara visual (EL03).

- Tabel x–y terisi otomatis untuk 2–3 nilai x; titik muncul di bidang Kartesius, lalu garis terhubung.
- Dua garis berbeda warna; titik potong disorot dan koordinatnya ditampilkan.
- Bidang dapat di-zoom & digeser dengan sentuhan; berjalan ≥ 30 fps di HP kelas menengah-bawah.

### US-18 Menebak titik potong (FR-09) · M · 3 SP
Sebagai **siswa**, saya ingin menggeser titik ke perpotongan, agar saya berlatih menentukan titik potong (EL01).

- Titik "menempel" ke koordinat bilangan bulat; umpan balik saat dilepas.

### US-19 Grafik bantu di soal (FR-09) · S · 2 SP
Sebagai **siswa**, saya ingin membuka grafik bantu di soal substitusi/eliminasi, agar saya bisa memeriksa jawaban secara visual (DS01).

- Grafik bantu tampil sebagai panel di bawah soal (bukan halaman lain) untuk menghindari split-attention.

---

## E6 — Latihan Berpola

### US-20 Alur contoh → melengkapi → mandiri (FR-10) · M · 8 SP
Sebagai **siswa**, saya ingin melihat contoh lalu berlatih soal berpola sama, agar saya bisa meniru dan lama-lama mandiri (GL03, GL05).

- Worked example: semua langkah terlihat, siswa menekan "Lanjut" per langkah.
- Soal melengkapi 1: hanya langkah terakhir yang kosong; soal melengkapi 2: dua langkah terakhir kosong.
- Soal mandiri: semua langkah kosong.

### US-21 Soal angka acak (FR-10) · M · 5 SP
Sebagai **siswa**, saya ingin mendapatkan soal baru dengan pola sama tetapi angka berbeda, agar saya bisa berlatih lagi.

- Tombol "Soal lain yang mirip" menghasilkan soal dari templat dengan solusi bilangan bulat (tingkat dasar) dalam rentang −10..10.
- Generator menjamin sistem punya tepat satu solusi (determinan ≠ 0).

---

## E7 — Refleksi & Catatan

### US-22 Catatanku (FR-12) · S · 5 SP
Sebagai **siswa**, saya ingin membuat catatan sendiri per materi, agar saya lebih mudah mengingat (GL01).

- Ikon catatan di setiap layar materi; catatan tersimpan otomatis.
- Siswa dapat menyematkan rumus/kartu metode/tangkapan grafik ke catatan.

### US-22a Menulis persamaan di catatan (FR-12) · S · 5 SP
Sebagai **siswa**, saya ingin menulis simbol dan persamaan matematika dengan mudah di catatan, agar catatan saya cepat ditulis dan rapi dibaca.

- Bilah simbol di atas kolom catatan menyisipkan simbol di posisi kursor (x biru, y oranye).
- Tombol **∑ Persamaan** (atau Ctrl+M) membuka editor persamaan dengan pratinjau langsung; tombol **{ Sistem** membuka templat dua persamaan.
- **Given** saya menulis `(x + 1)/2`, `x^2`, `x_1`, atau `sqrt(16)`, **then** pratinjau menampilkan pecahan bersusun, pangkat, indeks bawah, atau akar.
- **Given** saya mengetik `<=`, `>=`, `!=`, `->`, **then** tampil sebagai ≤, ≥, ≠, →.
- **Given** persamaan di pratinjau, **when** saya mengetuknya, **then** editor terbuka berisi persamaan itu dan bisa diubah atau dihapus.
- Teks yang dipilih saat menekan **∑ Persamaan** langsung menjadi isi editor.

### US-23 Jelaskan dengan kata-katamu (FR-13) · S · 3 SP
Sebagai **siswa**, saya ingin menuliskan penjelasan singkat setelah menyelesaikan soal, agar pemahaman saya lebih kuat (GL04).

- Prompt opsional, maks. 280 karakter, dapat dilewati.

---

## E8 — Dashboard Guru

### US-24 Ringkasan kelas (FR-15) · M · 5 SP
Sebagai **guru**, saya ingin melihat ringkasan kelas, agar saya tahu kondisi kelas secara cepat.

- Kartu: jumlah siswa aktif 7 hari, rata-rata penyelesaian modul, rata-rata skor, topik prasyarat terlemah.

### US-25 Heatmap langkah tersulit (FR-15) · M · 8 SP
Sebagai **guru**, saya ingin tahu langkah mana yang paling sering salah, agar saya bisa menjelaskan ulang di kelas.

- Heatmap baris = pola soal, kolom = langkah; warna = tingkat kesalahan + penggunaan petunjuk level 3.
- Klik sel → daftar siswa terkait & contoh jawaban salah yang umum.

### US-26 Detail siswa (FR-15) · M · 5 SP
Sebagai **guru**, saya ingin melihat detail per siswa, agar saya dapat memberi bantuan individual.

- Riwayat diagnostik, progres modul, petunjuk yang dipakai, jawaban "Jelaskan dengan kata-katamu".

### US-27 Ekspor CSV (FR-16) · S · 3 SP
Sebagai **guru**, saya ingin mengekspor nilai kelas ke CSV, agar dapat diolah di Excel/rapor.

- File UTF-8 dengan BOM (agar terbaca benar di Excel), kolom: nama, username, skor diagnostik, status & skor tiap modul, terakhir aktif.

---

## E9 — Offline & Aksesibilitas

### US-28 Belajar offline (FR-17) · S · 8 SP
Sebagai **siswa**, saya ingin tetap membuka materi tanpa internet, agar dapat belajar di rumah meski kuota habis.

- Modul yang pernah dibuka tersimpan; indikator "Tersedia offline".
- Jawaban offline masuk antrean dan tersinkron otomatis saat online; konflik diselesaikan dengan "yang terbaru menang" per langkah.
- Validasi offline memakai pemeriksa sisi klien sederhana (substitusi nilai numerik), lalu divalidasi ulang di server.

### US-29 Ukuran teks & mode gelap (FR-19) · C · 5 SP
Sebagai **siswa**, saya ingin memperbesar teks atau memakai mode gelap, agar nyaman membaca.

---

## E10 — Literasi Matematika

### US-30 Siklus pemodelan terpandu (FR-20) · M · 13 SP
Sebagai **siswa**, saya ingin dipandu dari membaca cerita sampai menafsirkan jawaban, agar saya bisa mengubah soal cerita menjadi model matematika sendiri.

- 7 tahap tampil berurutan, satu tahap per layar; cerita selalu dapat dibuka di bagian atas.
- **Given** tahap "Pahami", **when** saya mengetuk frasa di cerita, **then** frasa disorot sesuai jenisnya (diketahui = hijau, ditanya = ungu, tidak diperlukan = abu-abu dicoret).
- **Given** tahap "Terjemahkan", **when** saya menyusun persamaan dari kepingan, **then** persamaan dicek kesetaraannya dan umpan balik pemodelan (`MODEL_REVERSED`, `MODEL_MISSING_COEF`, dll.) muncul ≤ 15 kata.
- **Given** jawaban saya tidak wajar (mis. harga negatif), **when** di tahap "Periksa kewajaran", **then** aplikasi mengajak saya kembali ke tahap "Terjemahkan".
- Pada soal pertama, tahap 1–3 dicontohkan; contoh berkurang di soal berikutnya.

### US-31 Soal literasi bertingkat (FR-21) · M · 8 SP
Sebagai **siswa**, saya ingin berlatih soal cerita dari berbagai situasi nyata yang makin menantang, agar saya terbiasa memakai matematika dalam kehidupan sehari-hari.

- Tersedia ≥ 10 soal per level (L1, L2, L3) dari ≥ 4 kategori konteks.
- L2 memuat representasi tabel/struk/gambar dan informasi berlebih; L3 memuat soal keputusan atau evaluasi klaim.
- L2 terbuka setelah 3 soal L1 ≥ 75; L3 setelah 3 soal L2 ≥ 75; guru dapat membuka manual.
- Soal memakai format AKM (pilihan ganda, pilihan ganda kompleks, menjodohkan, isian, uraian).

### US-32 Profil literasi (FR-26) · S · 5 SP
Sebagai **guru**, saya ingin melihat apakah siswa lemah di merumuskan model atau di berhitung, agar intervensi saya tepat.

- Grafik batang per indikator (merumuskan, menerapkan, menafsirkan, penalaran) untuk kelas dan tiap siswa.
- Tabel keberhasilan per kategori konteks.

---

## E11 — Pemodel Soal Cerita (AI)

### US-33 Memodelkan soal cerita otomatis (FR-22) · M · 13 SP
Sebagai **siswa**, saya ingin menempelkan soal cerita dari buku/PR dan melihat model matematikanya, agar saya paham bagaimana cerita diubah menjadi persamaan.

- **Given** pemodel AI aktif di kelas saya dan kuota tersisa, **when** saya mengirim soal SPLDV ≤ 1.000 karakter, **then** dalam ≤ 12 detik (p95) tampil variabel + satuan, dua persamaan beserta kalimat sumbernya, dan yang ditanyakan.
- Model hanya tampil bila berstatus `verified`/`verified_special`; selama proses tampil indikator "Sedang membaca soalmu…".
- **Given** soal bukan SPLDV, **then** pesan: "Soal ini bukan SPLDV, jadi belum bisa dimodelkan di sini."
- **Given** model gagal diverifikasi, **then** pesan: "Aku belum yakin dengan modelnya. Coba Latih Pemodelan atau tanyakan gurumu."
- Kolom input menampilkan peringatan untuk tidak menulis data pribadi.
- Saya dapat memberi 👍/👎 pada model; 👎 meminta alasan singkat opsional.

### US-34 Menyelesaikan dari model AI (FR-23) · M · 8 SP
Sebagai **siswa**, saya ingin memilih cara belajar setelah model dibuat, agar saya tetap berlatih dan tidak hanya menyalin jawaban.

- Pilihan: **Bantu aku langkah demi langkah** (default), **Aku selesaikan sendiri** (model saja), **Tunjukkan penyelesaian lengkap**.
- Mode "bantu" menjalankan siklus FR-20 tahap 2–6; jawaban saya dicek terhadap model AI yang sudah terverifikasi.
- Semua nilai & langkah dihitung SymPy; tafsiran akhir memakai makna & satuan variabel.
- Attempt tercatat seperti soal biasa (`source = "ai"`), termasuk petunjuk yang dipakai.

### US-35 Kontrol guru atas pemodel AI (FR-24) · S · 8 SP
Sebagai **guru**, saya ingin mengatur pemakaian AI di kelas saya, agar sesuai kebijakan sekolah dan tidak membuat siswa bergantung.

- Pengaturan kelas: aktif/nonaktif (default nonaktif), kuota harian per siswa (0–30, default 10), izinkan "penyelesaian lengkap" (ya/tidak).
- Daftar kiriman siswa (teks, status, 👍/👎) dapat difilter.
- Guru dapat menyetujui kiriman `verified` untuk masuk ke bank soal kelas, dengan opsi mengedit makna variabel & level literasi.

### US-36 Buat soal sendiri (FR-25) · S · 5 SP
Sebagai **siswa**, saya ingin menulis soal cerita untuk SPLDV yang diberikan, agar saya benar-benar paham arti setiap persamaan.

- **Given** sistem sasaran, **when** saya mengirim cerita ≤ 500 karakter, **then** aplikasi menyatakan cocok/tidak cocok dan menunjukkan persamaan mana yang belum sesuai.
- Cerita yang cocok dapat diajukan ke guru (masuk antrean tinjauan US-35).

---

## Definition of Done (berlaku untuk semua story)

- [ ] Kriteria penerimaan terpenuhi dan diuji
- [ ] Tes unit/integrasi ditulis dan lulus di CI
- [ ] Teks UI mematuhi aturan konten CLT ([04-LEARNING-DESIGN.md](04-LEARNING-DESIGN.md))
- [ ] Diuji di Chrome desktop dan HP Android (layar 360 px)
- [ ] Aksesibilitas dasar dicek (kontras, label, target sentuh)
- [ ] Dokumentasi API/konten diperbarui bila relevan
- [ ] Code review (mandiri dengan checklist atau oleh rekan)
