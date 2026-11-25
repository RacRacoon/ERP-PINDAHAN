# B4 ERP — instruksi repo

Baca `RENCANA.md` sebelum menulis kode. (Salinan ada di repo ini.) Dokumen itu sumber kebenaran untuk model bisnis, rumus, dan UI.

## Bahasa

- Komunikasi dengan user: Bahasa Indonesia, langsung, tanpa basa-basi.
- Identifier kode, nama tabel, nama kolom: Inggris/campuran sesuai `prisma/schema.prisma`.
- Label UI: Bahasa Indonesia.
- Komentar kode: Bahasa Indonesia untuk aturan bisnis, Inggris untuk hal teknis umum.

## Aturan yang tidak boleh dilanggar

1. **`shareLab` tidak pernah jadi kolom database.** Selalu dihitung:
   ```ts
   shareLab = jumlah - modalPasta - ongkir - shareMarketing - sharePekerja - shareManajemen
   ```
   Kalau tergoda menyimpannya untuk mempercepat query, jangan. Empat pos harus selalu berjumlah persis keuntungan bersih.

2. **Nilai tarif disalin ke job saat dibuat.** Job menyimpan `rateId` untuk jejak, tapi `modalPasta` dan tiga `share*` adalah snapshot. Mengubah tarif tidak boleh mengubah laporan bulan lalu.

3. **`manage` di reparasi dihitung sebagai sisa**, bukan persentase:
   ```ts
   kasLab = Math.round(keuntungan * persenKasLab / 100)
   manage = keuntungan - kasLab
   ```

4. **Uang selalu `Int` rupiah penuh.** Tidak ada float, tidak ada Decimal untuk uang. `Decimal` hanya untuk `diskonPersen` yang sifatnya tampilan.

5. **Rekap tidak pernah diketik.** Semua angka rekap hasil agregasi dari job. Kalau ada tabel rekap di database, itu salah.

6. **Rekap dikelompokkan berdasarkan `tanggalSelesai`**, bukan `tanggalMasuk`. Mengikuti sheet lama supaya bisa dibandingkan.

## Test yang wajib ada sebelum fase 2 dianggap selesai

Pakai data asli, bukan data karangan:

```ts
// Gaming, tarif September 2026
hitungBagiHasil({ jumlah: 250000, modalPasta: 35167, ongkir: 0,
  shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 75000 })
  // => keuntunganBersih 214833, shareLab 34833

// Work, promo 9-11 September
hitungBagiHasil({ jumlah: 135150, modalPasta: 15100, ongkir: 0,
  shareMarketing: 8017, sharePekerja: 60000, shareManajemen: 40000 })
  // => keuntunganBersih 120050, shareLab 12033

// Gaming, promo 17-21 Agustus (pakai ongkir)
hitungBagiHasil({ jumlah: 207500, modalPasta: 35167, ongkir: 12000,
  shareMarketing: 15000, sharePekerja: 75000, shareManajemen: 50000 })
  // => keuntunganBersih 172333, shareLab 20333

// Reparasi September
hitungReparasi({ jumlah: 1150000, modalReparium: 1050000, persenKasLab: 40 })
  // => keuntungan 100000, kasLab 40000, manage 60000
```

Rekap September hasil generate harus persis:

```
uang masuk        1.355.300
modal pasta         165.901
keuntungan bersih 1.189.399
lab                 159.950
marketing            88.332
pekerja             545.000
manajemen           396.117
```

Angka itu dari sheet asli. Kalau tidak cocok, ada yang salah di rumus atau seed — jangan dibulatkan supaya cocok.

## Gaya kode

- Server Actions untuk mutasi, bukan route handler, kecuali ada alasan jelas.
- Validasi input dengan Zod di boundary server action.
- Satu file per layar di `src/app/`, komponen bersama di `src/components/`.
- Logika perhitungan di `src/lib/hitung.ts`, murni, tanpa akses database — supaya bisa di-test.

## Tema

Charcoal gelap dengan aksen hijau terminal. Token sudah dipakai konsisten di mockup `ui/`:

```css
--bg:      #101316;
--panel:   #171C20;
--panel-2: #1D2429;
--border:  #2B343A;
--text:    #E8EDF0;
--muted:   #96A2AA;
--accent:  #38D47F;
--accent-dim: #1B6B45;
--amber:   #F2A93B;
--blue:    #5AB0F5;
--red:     #F2706A;
```

Font: IBM Plex Sans untuk UI, JetBrains Mono untuk angka, tanggal, dan kode. Keduanya dari Google Fonts.

Angka uang selalu mono dan rata kanan. Format Indonesia: `1.355.300`, bukan `1,355,300`.

## Yang belum diputuskan

Tanya user sebelum mengasumsikan:

- Tarif Oktober turun tapi pembagian belum disesuaikan (lihat RENCANA.md §10 poin 5). Seed memakai angka apa adanya.
- Tarif "Anak B4" untuk tipe WORK belum pernah dipakai. Angka di seed tebakan.
- Apakah "Pekerja" selalu orang yang sama dengan PJ.

## Next.js 16

@AGENTS.md

## Catatan implementasi

- DB dev: Postgres lokal port 5433 (`npm run db:start`), data di `../.pgdev`. Produksi: Neon, lihat RENCANA.md §8.
- `proxy.ts` menggantikan middleware di Next 16.
- `.env`: hash bcrypt harus ditulis `\$` (escape Next), kalau tidak login selalu gagal.
- Manajemen dipegang Person bernama `ADMIN_NAMA` (belum ada penerima khusus di schema).
- Modal pasta dibulatkan ke atas per 100 mulai Oktober 2026 (Gaming 35.200, Work 15.100). Tarif Agustus–September tetap 35.167 sebagai data historis.
- Mulai bersih dari Oktober 2026: tidak ada job, customer, atau tarif Agustus–September. Arsipnya ada di `seed/arsip/` (tidak dipakai seed).
- Seed (`npm run db:seed`) hanya menambah/memperbarui, tidak pernah menghapus. Aman di Neon.
- Gaming Oktober: manajemen 65.000, Kas Lab 29.800. Work Oktober belum disesuaikan (Kas Lab 9.900).
- Campaign "Ajak Teman Nov 2026" (1–30 Nov 2026): `RatePeriod.campaign = true`, dipilih per job dan tidak menggantikan tarif Oktober. `RatePeriod.acuanId` menunjuk periode normal pembanding diskon di rekap. Tanggal dan tipe dicek di server (`src/lib/campaign.ts`, `cekTarifCampaign`); Cleaning tidak ikut. Pasangan referral: `ServiceJob.referralKode` (sama di kedua job) + `referralPeran` (PENGAJAK/TEMAN). Job campaign yang sendirian di kodenya = "Menunggu pasangan". Tarif: Gaming 210.000, Work 130.000, MacBook 255.000. Kas Lab sama dengan Oktober.
- Form servis dikirim lewat `onSubmit` + `startTransition`, bukan `action={aksi}`, supaya isian tidak terhapus saat server menolak simpan (React 19 mereset form setelah action).
- Kontak customer: `Customer.noWa` dan `Customer.instagram` sama-sama opsional dan unik, minimal salah satu terisi (dicek di aplikasi, bukan di database). Form servis dan reparasi memakai satu kolom `customerKontak`; `bacaKontak` (`src/lib/kontak.ts`) menentukan jenisnya: angka = WA, selain itu = Instagram. Username semua angka harus diawali `@`. Instagram disimpan huruf kecil tanpa `@`. Halaman Customer punya dua kolom terpisah, karena satu customer bisa punya keduanya.
- **Nama bisnis sejak November 2026: B4 Service Center** (B = Four, 4fter), bukan lagi B401. Rakan lepas dari lab B401; lab hanya meminjamkan ruang. Nama folder, package (`b401-erp`), dan database tetap `b401`. Alamat di header Laporan ("Lab B401, Teknik Elektro ITS") sengaja tidak diubah karena itu lokasi fisik.
- **Rencana tarif "Desember 2026" (Sewa Tempat Kas Lab 15.000/10.000/10.000/15.000, MacBook 275.000, Pekerja 90.000) DIBATALKAN Rakan pada 22 Nov 2026.** Tarif Oktober 2026 berlaku terus tanpa tanggal selesai, ditambah campaign "Ajak Teman Nov 2026" sampai 30 Nov. Jangan menghidupkan lagi tarif Desember tanpa konfirmasi. Tarif "Anak B4" tetap berakhir 29 November 2026 dan disembunyikan dari pilihan tarif di form (belum dipastikan apakah ini ikut dibatalkan). Label di UI tetap "Kas Lab". Modal pasta Gaming: tarif 35.200, acuan di halaman Tarif 23.400.
- Tarif normal yang dipakai ditentukan tanggal, bukan bendera `aktif` saja: `periodeBerlaku` (`src/lib/campaign.ts`) memilih tarif normal yang aktif dengan `mulai` terbaru yang sudah lewat. Form servis, topbar, dan halaman Tarif memakainya, jadi pergantian bulan tidak perlu mengubah bendera dengan tangan. Tarif baru cukup ditambahkan lewat `seed/rate-periods.json` (atau script) dengan `mulai` di depan; tarif lama diberi `selesai` hanya kalau memang berakhir.
- **Perjanjian baru sejak November 2026, berlaku seterusnya, hanya untuk reparasi hardware (yang lewat Reparium):** Kas Lab 0%, seluruh keuntungan jadi Manage. `persenKasLab` default 0 (`PERSEN_KAS_LAB_REPARASI_BARU` di `hitung.ts`). Servis pasta (Gaming, Work, Cleaning, Repaste MacBook) tidak ikut perjanjian ini: Kas Lab tetap seperti tarif Oktober. Data Oktober dan sebelumnya tetap, termasuk reparasi 30% dan 40%. Jangan menyisihkan Kas Lab dari servis pasta tanpa konfirmasi Rakan: salah baca soal ini pernah terjadi dan sudah dikembalikan.

## Konteks pindah laptop

Baca `KONTEKS-PINDAH.md` untuk keputusan terbaru, hal yang masih terbuka, dan gaya kerja dengan Rakan.
