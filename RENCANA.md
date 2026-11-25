# B401 Service Center — Rencana ERP

Dokumen handoff untuk dibangun di Claude Code / VSCode.
Disusun 2 Oktober 2026, berdasarkan `List_pengerjaan.xlsx` (Agustus–Oktober 2026).

Isi folder ini:

```
RENCANA.md              dokumen ini
CLAUDE.md               instruksi untuk agent di repo
prisma/schema.prisma    schema siap pakai
seed/*.json             data asli Agustus–September 2026
ui/*.png                mockup 7 layar + diagram
```

---

## 1. Apa yang dibangun

Satu web app untuk input dan monitoring B401 Service Center. Menggantikan tiga sheet yang sekarang diisi manual dan tidak saling cocok.

Yang berubah dibanding cara sekarang:

| Sekarang | Setelah ERP |
|---|---|
| Daftar servis dan rekap harian diketik terpisah | Rekap dihitung dari job, tidak bisa beda |
| Bagi hasil dihitung manual per periode | Otomatis saat job disimpan |
| Tarif promo disalin ke tabel baru tiap kali | Tarif jadi data, job menunjuk ke periode tarif |
| Tidak ada catatan customer | Ada customer, instansi, nomor WA |

Yang **tidak** berubah: cara kerja bisnisnya. Rumus, tarif, dan pembagiannya persis seperti sheet sekarang.

---

## 2. Model bisnis

Dua lini, dihitung dengan cara berbeda.

### 2.1 Servis pasta

Harga ditentukan **tipe laptop**, bukan jenis pekerjaan.

- `GAMING` — di sheet lama ditulis "Gaming"
- `WORK` — di sheet lama ditulis "Work", "Non-Gaming", atau "Laptop Biasa". Tiga nama, satu hal. Pakai `WORK` saja.

Modal cuma pasta. Harganya turunan dari harga tube dibagi jumlah job yang bisa dilayani satu tube.

Keuntungan dibagi ke empat pos: **Marketing**, **Pekerja**, **Manajemen**, **Kas Lab**.

### 2.2 Reparasi hardware

Dikerjakan vendor luar (Reparium). B401 ambil selisih antara harga ke customer dan harga vendor.

Keuntungannya dibagi dua: **Kas Lab 40%**, **Manage 60%**.

Margin lini ini tipis — September: omzet Rp 2.100.000, keuntungan Rp 250.000 (12%).

### 2.3 Orang

- **PJ** — yang mengerjakan. Dapat jatah "Pekerja".
- **Marketing** — yang membawa customer. Dapat jatah "Marketing".
- **Manajemen** — jatah pengelolaan.
- **Kas Lab** — kas lab B401.

Satu orang bisa punya lebih dari satu peran (Edward dan Faiq pernah jadi PJ sekaligus marketing untuk job mereka sendiri).

---

## 3. Aturan perhitungan

Ini bagian paling penting. Salah di sini, semua laporan salah.

### 3.1 Servis pasta

```ts
keuntunganBersih = jumlah - modalPasta

shareLab = keuntunganBersih
         - ongkir
         - shareMarketing
         - sharePekerja
         - shareManajemen
```

**`shareLab` adalah sisa, bukan persentase.** Jangan pernah simpan sebagai kolom input. Hitung saat dibutuhkan. Dengan begitu empat pos selalu berjumlah persis `keuntunganBersih` — tidak mungkin melenceng.

Diverifikasi ke empat periode tarif berbeda di sheet asli, cocok semua. Contoh promo 17–21 Agustus (Gaming):

```
207.500 − 35.167 − 12.000 − 15.000 − 75.000 − 50.000 = 20.333   ✓ sama dengan "Lab Promo" di sheet
```

### 3.2 Reparasi hardware

```ts
keuntungan = jumlah - modalReparium
kasLab     = Math.round(keuntungan * persenKasLab / 100)
manage     = keuntungan - kasLab
```

`persenKasLab` disimpan per job, bukan konstanta global. Data Agustus 2026 pakai 30, September ke atas pakai 40.

`manage` dihitung sebagai sisa, bukan `keuntungan * 60 / 100`. Supaya `kasLab + manage` selalu persis `keuntungan` tanpa selisih pembulatan.

### 3.3 Snapshot vs referensi

Saat job dibuat, nilai dari tabel `Rate` **disalin** ke baris job (`modalPasta`, `shareMarketing`, `sharePekerja`, `shareManajemen`). Job tetap menyimpan `rateId` untuk jejak.

Alasannya: tarif berubah tiap bulan. Kalau job cuma menunjuk ke tarif, mengubah tarif Oktober akan mengubah laporan September. Snapshot mencegah itu, sekaligus membolehkan override per job — yang memang terjadi di data asli (job 4 Sep harga 200.000 dengan pembagian yang tidak cocok tabel manapun).

### 3.4 Rekap bulanan

Rekap **tidak pernah diketik**. Semua angkanya hasil agregasi:

```sql
-- per minggu, dikelompokkan berdasarkan tanggalSelesai
SUM(jumlah), SUM(modalPasta),
SUM(jumlah - modalPasta) AS keuntunganBersih,
SUM(shareMarketing), SUM(sharePekerja), SUM(shareManajemen),
SUM(jumlah - modalPasta - ongkir - shareMarketing - sharePekerja - shareManajemen) AS shareLab
```

Catatan: sheet lama mengelompokkan rekap harian berdasarkan **tanggal selesai**, bukan tanggal masuk. Ikuti itu supaya angka historisnya bisa dibandingkan.

---

## 4. Arsitektur

![Arsitektur sistem](./ui/8-arsitektur.png)

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js App Router | Input dan monitoring satu app, Server Actions cukup untuk mutasi |
| Database | Neon Postgres | Serverless, free tier cukup, murni Postgres |
| ORM | Prisma | Migrasi dan tipe otomatis |
| Auth | Auth.js (NextAuth) credentials | Satu user, tidak perlu OAuth |
| Chart | Recharts | Ringan, cukup untuk bar chart |
| Hosting | Vercel | Lihat catatan lisensi di §8.4 |

**Tidak ada sinkronisasi berkala.** Input dan monitoring ada di app yang sama, langsung ke Postgres. Data fresh tiap halaman dibuka. Cron hanya untuk hal yang memang periodik: cek stok pasta menipis dan job yang belum lunas.

**InfluxDB tidak dipakai.** Itu time-series database, cocok untuk data sensor yang jalan terus. Data B401 relasional dan transaksional.

**Google Sheets jadi opsional.** Kalau mau tetap ada mirror, buat cron bulanan yang menulis baris transaksi ke Sheets. Satu arah saja — Sheets tidak boleh jadi sumber tulis, itu akan mengembalikan masalah dua tabel yang tidak cocok.

---

## 5. Data model

![Data model](./ui/9-data-model.png)

Schema lengkap ada di `prisma/schema.prisma`. Ringkasnya:

| Tabel | Isi |
|---|---|
| `User` | login, satu baris |
| `Instansi` | asal customer — departemen, himpunan, lab, perusahaan, umum |
| `Customer` | nama, nomor WA (unique), instansi |
| `Person` | PJ dan marketing |
| `RatePeriod` | periode tarif: bulanan, promo, atau tarif internal |
| `Rate` | harga + modal + pembagian, satu baris per (periode, tipe) |
| `ServiceJob` | servis pasta |
| `RepairJob` | reparasi hardware lewat Reparium |
| `PastaLot` | pembelian tube pasta |
| `Payout` | catatan pembayaran ke orang per bulan |

Keputusan yang perlu diketahui:

- **Uang disimpan sebagai `Int` rupiah penuh.** Tidak ada sen di transaksi B401. Int menghindari error floating point pada penjumlahan laporan.
- **`shareLab` tidak ada di schema.** Sengaja — lihat §3.1.
- **`ongkir` tetap ada dengan default 0.** Sudah tidak dipakai sejak September, tapi data Agustus punya nilainya. Hapus dari form input, biarkan di database.
- **`Customer` nullable di kedua job.** Sheet lama tidak mencatat customer sama sekali, jadi 25 job historis tidak punya. Job baru sebaiknya selalu diisi.

---

## 6. UI — tujuh layar

Semua angka di mockup diambil dari sheet asli September 2026. Tidak ada yang dikarang.

Tema: charcoal gelap, aksen hijau terminal, mono untuk angka — mengikuti brand B401 yang sudah ada.
Font: IBM Plex Sans (UI) + JetBrains Mono (angka, kode, tanggal).

### 6.1 Dashboard

![Dashboard](./ui/1-dashboard.png)

Empat KPI: uang masuk, keuntungan bersih, Kas Lab, belum lunas. Chart harian servis. Bagi hasil empat pos. Panel "Perlu dicek" untuk anomali data. Tabel servis terakhir.

Panel "Perlu dicek" itu fitur, bukan hiasan. Isinya hasil validasi otomatis:
- job yang `shareLab` negatif
- periode tarif yang jumlah pembagiannya melebihi keuntungan
- `RepairJob` dengan `persenKasLab` berbeda dalam satu bulan

### 6.2 Servis pasta

![Servis](./ui/2-servis.png)

Tabel dengan kolom yang sama persis dengan sheet lama: tanggal masuk, tanggal selesai, model laptop, tipe, PJ, marketing, pembayaran, jumlah, status.

Status gabungan dari dua hal: `status` (BOOKING / DIKERJAKAN / SELESAI / BATAL) dan `lunas` (boolean). Ditampilkan sebagai satu badge.

Baris total di bawah menampilkan selisih dengan rekap kalau ada — selama data lama masih dipakai.

### 6.3 Input servis

![Input servis](./ui/3-servis-baru.png)

Layar paling sering dipakai. Kiri form, kanan hitungan langsung.

Panel kanan menampilkan rantai perhitungan penuh: harga → modal pasta → keuntungan bersih → tiga pos pembagian → Kas Lab sebagai sisa. Tiga pos pembagian bisa diedit per job, Kas Lab ikut berubah otomatis.

Peringatan kuning muncul kalau tarif aktif tidak konsisten — seperti kasus Oktober sekarang.

Field yang perlu ada: tanggal masuk, model laptop, tipe, keluhan, customer (cari/buat), PJ, marketing, pembayaran, periode tarif, status awal.

### 6.4 Reparasi

![Reparasi](./ui/4-reparasi.png)

Tabel terpisah dengan kolom sendiri: masalah, penyelesaian, jumlah, modal Reparium, keuntungan, Kas Lab, Manage, status transfer.

Dikelompokkan per bulan supaya perbedaan persentase Agustus dan September kelihatan.

### 6.5 Bagi hasil

![Bagi hasil](./ui/5-bagi-hasil.png)

Siapa dapat berapa bulan ini. Tabel per orang per peran, dengan tombol tandai lunas.

Baris "Tidak terlacak" muncul kalau total jatah di rekap tidak sama dengan jumlah per job. Di data September ada Rp 25.000 seperti itu. Setelah pakai app, baris ini seharusnya tidak pernah muncul lagi.

### 6.6 Tarif & promo

![Tarif](./ui/6-tarif.png)

Semua periode tarif dalam satu tabel. Kolom Kas Lab **dihitung**, tidak diinput — kalau angkanya aneh, berarti pembagiannya yang salah.

Banner peringatan di atas untuk periode aktif yang tidak konsisten.

Di bawah: modal pasta (harga tube ÷ job per tube) dan stok tube tersisa.

### 6.7 Rekap bulanan

![Rekap](./ui/7-rekap.png)

Bentuknya sengaja sama dengan sheet rekap sekarang supaya mudah dicocokkan: per minggu, dengan total bulan.

Panel "Cek silang" membandingkan daftar servis dengan rekap. Selama data lama dipakai, selisihnya kelihatan. Untuk data baru selalu nol.

Export: PDF, xlsx, dan sync Sheets opsional.

---

## 7. Fase build

Tiap fase menghasilkan sesuatu yang bisa dipakai sebelum fase berikutnya jadi.

### Fase 1 — fondasi
- `create-next-app` + Tailwind + TypeScript
- Prisma + Neon, jalankan migrasi pertama
- Auth.js credentials, satu user dari env
- Seed `Person`, `RatePeriod`, `Rate`, `PastaLot`
- Layout: sidebar + topbar sesuai mockup

Selesai kalau: bisa login, tabel tarif terisi benar, semua `shareLab` hasil hitung cocok dengan angka sheet.

### Fase 2 — servis
- Layar 6.2 dan 6.3
- Server Action `createServiceJob` yang menyalin snapshot tarif
- Fungsi `hitungBagiHasil()` dengan unit test pakai data asli

Selesai kalau: input satu job Gaming Oktober menghasilkan Kas Lab 19.833.

### Fase 3 — reparasi
- Layar 6.4
- Server Action `createRepairJob`

### Fase 4 — bagi hasil & rekap
- Layar 6.5 dan 6.7
- Query agregasi per minggu dan per bulan
- Export xlsx (`exceljs` atau `xlsx`)

Selesai kalau: rekap September hasil generate cocok dengan sheet asli — 1.355.300 / 165.901 / 1.189.399 / 159.950 / 88.332 / 545.000 / 396.117.

### Fase 5 — dashboard & customer
- Layar 6.1
- CRUD `Customer` dan `Instansi`
- Validasi anomali untuk panel "Perlu dicek"
- Cron harian: stok pasta, job belum lunas

---

## 8. Setup

### 8.1 Perintah awal

```bash
npx create-next-app@latest b401-erp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd b401-erp
npm i prisma @prisma/client next-auth@beta bcryptjs recharts date-fns
npm i -D tsx @types/bcryptjs
npx prisma init
# salin prisma/schema.prisma dari folder ini
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

### 8.2 Environment

```env
DATABASE_URL="postgresql://...@...neon.tech/b401?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://...@...neon.tech/b401?sslmode=require"
AUTH_SECRET="hasil dari: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="..."
ADMIN_PASSWORD_HASH="hasil bcrypt, 10 rounds"
```

Neon memberi dua connection string. `DATABASE_URL` yang pooled untuk query aplikasi, `DIRECT_URL` yang direct untuk migrasi. Prisma butuh keduanya.

### 8.3 Neon free tier

Database auto-suspend setelah beberapa menit tanpa traffic. Request pertama setelah itu kena cold start sekitar 0,5–1 detik. Untuk dipakai sendiri, tidak masalah.

### 8.4 Lisensi Vercel

Vercel Hobby plan secara eksplisit untuk penggunaan non-komersial. B401 Service Center bisnis. Secara teknis butuh Pro (~$20/bulan).

Banyak yang menjalankan di Hobby tanpa masalah, tapi itu risiko yang perlu diketahui, bukan disembunyikan. Alternatif gratis untuk kasus komersial: VPS murah, atau Cloudflare Workers.

---

## 9. Seed

`seed/` berisi data asli:

| File | Isi |
|---|---|
| `rate-periods.json` | 6 periode tarif Agustus–Oktober + Anak B4 |
| `people.json` | 11 orang dari kolom PJ dan Marketing |
| `service-jobs.json` | 25 job servis, 31 Juli – 30 September |
| `repair-jobs.json` | 6 job reparasi |
| `pasta-lots.json` | stok pasta |

Field `_shareLabHarusnya` di `rate-periods.json` bukan kolom database. Itu nilai dari sheet asli, dipakai untuk memastikan rumus di §3.1 menghasilkan angka yang sama. Seeder harus menghitung `shareLab` sendiri lalu membandingkan — kalau beda, gagalkan seed.

Catatan seed:
- `tanggalSelesai` di `service-jobs.json` diambil dari sheet. Rekap dikelompokkan berdasarkan kolom ini.
- Job 4 September (Ideapad Gaming, 200.000) punya harga dan pembagian di luar tabel tarif manapun. Pembagiannya ada di field `catatan` — masukkan sebagai override.
- Tidak ada customer di data lama. Semua `customerId` null.

---

## 10. Temuan dari sheet lama

Ditemukan saat membaca `List_pengerjaan.xlsx`. Empat hilang sendiri setelah pakai app, dua butuh keputusan.

### Hilang sendiri

1. **Daftar servis dan rekap harian tidak cocok.** September: daftar 7 job = Rp 1.355.450, rekap 8 job = Rp 1.355.300. Masing-masing punya job yang tidak ada di yang lain.
2. **Rp 25.000 jatah pekerja tanpa job.** Rekap bilang 545.000, dijumlah dari daftar servis cuma 520.000.
3. **Judul "TOTAL AGUSTUS"** terpasang di sheet September dan Oktober.
4. **Tanggal minggu 2–4 sheet Oktober** masih tanggal September.

### Butuh keputusan

5. **Tarif Oktober tidak konsisten.** Harga turun (Gaming 250rb→235rb, Work 150rb→145rb) tapi jatah marketing, pekerja, dan manajemen tidak ikut turun. Kas Lab yang menanggung seluruh selisihnya:

   | Tipe | Kas Lab September | Kas Lab Oktober | Turun |
   |---|---|---|---|
   | Gaming | 34.833 | 19.833 | 43% |
   | Work | 14.900 | 9.900 | 34% |

   Seed memakai angka apa adanya. Kalau yang dimaksud bukan ini, ubah `rate-periods.json` sebelum seed.

6. **Baris Work Agustus tidak balance tanpa ongkir.** Sheet punya dua varian, hanya varian dengan ongkir yang jumlahnya pas. Seed memakai varian itu.

### Catatan bisnis

Reparasi September: omzet Rp 2.100.000 (61% dari total omzet) tapi hanya menyumbang Rp 100.000 ke Kas Lab (38% dari pemasukan Kas Lab). Servis pasta omzetnya lebih kecil tapi kontribusinya lebih besar.

Kalau dashboard dipakai untuk mengukur performa, jangan pakai omzet sebagai metrik utama.

Minggu 3 September (14–20) nol job.
