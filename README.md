# B4 ERP

Input dan monitoring B4 Service Center (dulu B401). Dokumen utama: `RENCANA.md` (model bisnis, rumus, UI) dan `CLAUDE.md` (aturan repo).

## Jalankan lokal

```bash
npm install
cp .env.example .env     # isi nilainya
npm run db:deploy        # terapkan migrasi
npm run db:seed          # orang, tarif Oktober + Anak B4, stok pasta
npm run dev              # http://localhost:3000
```

`npm test` menjalankan tes perhitungan. Seed aman dijalankan ulang dan tidak menghapus data.

## Pindah laptop

Data ada di Neon (cloud), bukan di laptop. Kode ini hanya aplikasinya. Yang perlu dibawa: folder proyek dan file `.env`.

1. Pasang Node.js 24 LTS (dibuat dengan 24.18; Node 22 ke atas seharusnya cukup). `npm` ikut terpasang. Git, PostgreSQL, dan Prisma CLI global tidak perlu.
2. Salin folder `b401-erp` tanpa `node_modules` dan `.next` (keduanya dibuat ulang, dan jangan biarkan OneDrive menyinkronkannya).
3. Salin `.env` dengan aman (flashdisk atau pesan ke diri sendiri). File ini berisi password Neon, `AUTH_SECRET`, dan hash password login. Jangan lewat grup chat atau repo publik. Tanpa `.env`, buat ulang dari `.env.example`: connection string ada di dashboard Neon (Connection Details), hash password dengan `npm run password`.
4. Di folder proyek: `npm install` (otomatis menjalankan `prisma generate`), lalu `npm run build`.
5. Jalankan: `npm run start`, atau klik `scripts/B4 ERP.bat` (path folder otomatis, jadi aman dipindah; buat pintasannya di Desktop). Bat itu membangun ulang sendiri kalau kode lebih baru dari build terakhir. Buka http://localhost:3000.
6. Jangan jalankan `db:deploy` atau `db:seed` di laptop baru kecuali ada migrasi baru. Database sudah terisi.

Cek berhasil: login jalan, halaman Servis menampilkan data yang sama dengan laptop lama.

Yang tidak ikut proyek ini:
- Cadangan data. Neon menyimpan riwayat singkat, bukan cadangan. Ekspor berkala belum ada.
- Sesi login: cookie tidak ikut, login ulang di laptop baru.
- `.env.lokal` dan skrip `db:start` untuk Postgres lokal port 5433 (`../.pgdev`) hanya cadangan pengembangan lama. Tidak dipakai produksi, boleh diabaikan.
- Di Windows, `npm run db:start` dan `db:stop` memakai path `C:/Program Files/PostgreSQL/17`. Tidak relevan kalau tidak memakai DB lokal.

## Pindah ke Neon

1. Buat project di neon.tech, ambil dua connection string (pooled dan direct).
2. Isi `DATABASE_URL` (pooled) dan `DIRECT_URL` (direct) di `.env`.
3. `npm run db:deploy` lalu `npm run db:seed`.
4. Untuk Vercel: isi semua variabel di `.env.example` lewat dashboard. `AUTH_URL` = URL produksi. Lihat catatan lisensi Vercel Hobby di `RENCANA.md` §8.4.

## Struktur

- `src/lib/hitung.ts` — rumus bagi hasil dan reparasi (murni, ada tes)
- `src/lib/queries.ts` — agregasi untuk dashboard, rekap, bagi hasil
- `src/app/(app)/` — satu folder per layar
- `prisma/schema.prisma`, `prisma/seed.ts`, `seed/*.json`
- `seed/arsip/` — data Agustus–September 2026, tidak dipakai
