# Konteks untuk Claude Code di laptop baru

Ditulis 25 November 2026, diperbarui 26 November dari percakapan di laptop lama. Baca ini bersama `CLAUDE.md` (aturan repo) dan `RENCANA.md` (model bisnis). Memori otomatis Claude di laptop lama (`~/.claude/projects/.../memory`) tidak ikut pindah, jadi isinya diringkas di sini.

## Cara bekerja dengan Rakan
- Balas dalam bahasa Indonesia yang polos dan langsung, tanpa basa-basi. Terapkan gaya `/stop-slop`.
- Uang dan data bisnis: jangan ubah tanpa konfirmasi. Salah baca soal Kas Lab pernah terjadi dan harus dikembalikan.
- Jangan push, buat repo GitHub, atau deploy tanpa izin tegas. Jangan tambah `Co-Authored-By: Claude` di commit atau PR.
- Kalau diminta diskusi ("jangan ubah apa pun"), jangan ubah apa pun.
- Verifikasi sebelum bilang selesai: `npx tsc --noEmit`, `npx eslint src prisma`, `npx vitest run` (71 tes), `npx next build`, lalu cek di browser. `npx eslint` untuk seluruh proyek gagal di 3 `require()` pada `scripts/set-password.cjs` (sudah lama, bukan masalah baru).

## Keadaan sistem
- Aplikasi: B4 Service Center (dulu B401, "B4" = B-four, 4fter). Next.js 16, Prisma 6, Auth.js v5, Tailwind 4, vitest. Database produksi = **Neon** (`.env`). Postgres lokal port 5433 sisa awal pengembangan, tidak dipakai.
- Jalankan: `npm install`, `npm run build`, `npm run start` atau `scripts/B4 ERP.bat`. Lihat README bagian "Pindah laptop".
- Folder tidak punya Git. Cadangan data belum ada (Neon saja).
- Tarif dibuat lewat skrip sekali pakai atau `seed/rate-periods.json`. Seed tidak pernah menimpa data yang ada. Job menyimpan snapshot tarif, jadi mengubah tarif tidak mengubah job lama.
- Tarif normal yang dipakai ditentukan tanggal lewat `periodeBerlaku` (`src/lib/campaign.ts`). Form servis, topbar, dan halaman Tarif memakainya.

## Keputusan yang sudah final
- **Tarif Oktober 2026 berlaku terus**, tanpa tanggal selesai: Gaming 235.000, Work 145.000, Cleaning 100.000, Repaste MacBook 285.000 (Pekerja 85.000). Kas Lab 29.800 / 9.900 / 20.000 / 45.800.
- **Promo "Ajak Teman Nov 2026"** (campaign) berlaku 1–30 November, lalu hilang dari pilihan form. Tarif acuannya Oktober.
- **Rencana tarif Desember 2026 dibatalkan** pada 22 Nov. Isinya: Kas Lab jadi "Sewa Tempat" tetap 15.000 / 10.000 / 10.000 / 15.000 mulai Senin 30 Nov, MacBook 275.000, Pekerja MacBook 90.000. Data dan seed-nya sudah dihapus. Cadangan ada di scratchpad laptop lama (`desember-dibatalkan.json`), bukan di folder ini. Jangan dihidupkan lagi tanpa konfirmasi.
- Reparasi hardware (lewat Reparium) sejak November: Kas Lab 0% (`persenKasLab` default 0), semua keuntungan ke Manage. Data Oktober dan sebelumnya tetap 30% dan 40%. Servis pasta tidak ikut perjanjian ini.
- Pasta Gaming: lot terbaru 20 Nov harga tube 67.700 plus `biayaTambahan` 2.300 (kolom baru), sisa 2 job. Acuan modal di halaman Tarif 23.400 per job. Modal di tarif tetap 35.200.
- Pasta Work dikoreksi 25 Nov: stok nyata 1 tube (5 job), sebelumnya tercatat 9 job. Teks stok hanya menghitung tube utuh (`teksTube` di `src/lib/format.ts`): 9 job dengan 5 job per tube tertulis "1 tube", kurang dari satu tube tertulis "kurang dari 1 tube".

## Latar belakang yang belum jelas
Rakan sempat membahas melepas bisnis dari Lab B401 (lab jadi mitra yang hanya menerima biaya ruang). Pesan WhatsApp ke koordinator lab menyebut kebijakan mulai 30 November dengan biaya tetap per servis. Setelah itu Rakan **membatalkan tarif Desember**. Belum jelas apakah kesepakatan dengan lab ikut batal atau hanya angkanya. Tanyakan dulu sebelum mengubah apa pun yang menyangkut Kas Lab atau lab.

## Keputusan terbuka (jangan diputuskan sendiri)
1. **Tarif "Anak B4"** masih berstatus berakhir 29 November (tersembunyi dari form sejak 30 Nov). Rakan hanya membatalkan tarif Desember, jadi belum dipastikan apakah ini ikut dibatalkan. Untuk mengembalikan: `RatePeriod.selesai = null` untuk "Anak B4", juga di `seed/rate-periods.json` dan `CLAUDE.md`.
2. **Bagi hasil November tidak konsisten.** Payout tercatat 20 Nov: Sandi 85.000, Marketing 20.000, Manajemen 94.800. Halaman Bagi hasil menampilkan Sandi 170.000, Marketing 40.000, Manajemen 130.000, semuanya "Dibayar", total 340.000. Penyebab: status "Dibayar" hanya memeriksa ada tidaknya catatan, tidak membandingkan nominal, jadi bagian job LOQ 20 Nov tampil seolah sudah dibayar. Nominal Manajemen 94.800 memuat 29.800 yang seharusnya Kas Lab (salah hitung awal), jadi yang benar 65.000 untuk MSI GF63. Tanya Rakan: berapa yang benar-benar sudah ditransfer, dan apakah status "Kurang Rp X" perlu ditambahkan di halaman Bagi hasil.
3. Fee marketing untuk anak lab (Fito, Ojan, Rildo, Rizza, Via) belum ditentukan. Mereka terdaftar tetapi belum punya job. Semua marketing saat ini Rakan sendiri.
4. Modal pasta Gaming di tarif (35.200) atau di acuan (23.400).
5. Label "Kas Lab" di UI (ganti ke "Biaya ruang"?). Alamat laporan masih "Lab B401, Teknik Elektro ITS, Surabaya". `README-Bagi-Hasil-B401.md` di Desktop masih nama dan angka lama.
6. Dari sebelumnya: modal MacBook 34.200 atau 35.200; harga Cleaning 100.000 atau 80.000 (brosur); ongkir antar-jemput; bagian Work di Oktober; reparasi Oktober yang diinput mundur (default 0); perbandingan Laporan Oktober dari arsip.

## Hal teknis yang mudah terlewat
- React 19 mereset form setelah Server Action. Gunakan state terkontrol atau `key` kalau input harus bertahan.
- Di `.env`, tiap `$` pada hash bcrypt ditulis `\$`. Di Vercel ditulis apa adanya.
- Tombol aksi memakai `aksiTeks`, `aksiIkon`, `aksiIkonBahaya` dari `src/components/ui.tsx`. Tabel responsif memakai `hidden md:table-cell`, dengan sel footer ganda untuk mobile dan desktop.
- Pengecekan browser: Playwright (`playwright-core`) dengan Edge dan cookie sesi `authjs.session-token` yang dibuat lewat `encode` dari `@auth/core/jwt` memakai `AUTH_SECRET`. Skrip lama ada di scratchpad laptop lama dan tidak ikut.
- Perilaku yang bergantung tanggal sistem (hilangnya Anak B4 dan campaign pada 30 Nov dan 1 Des) hanya diverifikasi lewat kode dan tes, tidak lewat simulasi tanggal di browser.

## Belum dikerjakan (hanya ditawarkan)
Siapkan Git atau Vercel (butuh reset password Neon dulu), ekspor cadangan database ke JSON, halaman edit tarif, laporan otomatis terkirim, ekspor xlsx, halaman kelola marketing, dan perapian mobile untuk dashboard "Servis terakhir", Customer, Bagi hasil, Rekap, Tarif, dan form.
