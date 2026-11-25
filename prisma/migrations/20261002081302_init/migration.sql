-- CreateEnum
CREATE TYPE "TipeLaptop" AS ENUM ('GAMING', 'WORK');

-- CreateEnum
CREATE TYPE "StatusJob" AS ENUM ('BOOKING', 'DIKERJAKAN', 'SELESAI', 'BATAL');

-- CreateEnum
CREATE TYPE "MetodeBayar" AS ENUM ('QRIS', 'DANA', 'TUNAI', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PeranPerson" AS ENUM ('TEKNISI', 'MARKETING', 'KEDUANYA');

-- CreateEnum
CREATE TYPE "KategoriPayout" AS ENUM ('PEKERJA', 'MARKETING', 'MANAJEMEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instansi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instansi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "noWa" TEXT NOT NULL,
    "instansiId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "peran" "PeranPerson" NOT NULL DEFAULT 'TEKNISI',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePeriod" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mulai" DATE NOT NULL,
    "selesai" DATE,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,

    CONSTRAINT "RatePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "ratePeriodId" TEXT NOT NULL,
    "tipe" "TipeLaptop" NOT NULL,
    "hargaServis" INTEGER NOT NULL,
    "modalPasta" INTEGER NOT NULL,
    "ongkir" INTEGER NOT NULL DEFAULT 0,
    "shareMarketing" INTEGER NOT NULL,
    "sharePekerja" INTEGER NOT NULL,
    "shareManajemen" INTEGER NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJob" (
    "id" TEXT NOT NULL,
    "tanggalMasuk" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "modelLaptop" TEXT NOT NULL,
    "tipe" "TipeLaptop" NOT NULL,
    "keluhan" TEXT,
    "customerId" TEXT,
    "pjId" TEXT NOT NULL,
    "marketingId" TEXT,
    "status" "StatusJob" NOT NULL DEFAULT 'DIKERJAKAN',
    "lunas" BOOLEAN NOT NULL DEFAULT false,
    "pembayaran" "MetodeBayar",
    "rateId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "diskonPersen" DECIMAL(5,2),
    "modalPasta" INTEGER NOT NULL,
    "ongkir" INTEGER NOT NULL DEFAULT 0,
    "shareMarketing" INTEGER NOT NULL,
    "sharePekerja" INTEGER NOT NULL,
    "shareManajemen" INTEGER NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairJob" (
    "id" TEXT NOT NULL,
    "tanggalMasuk" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "modelLaptop" TEXT NOT NULL,
    "tipe" "TipeLaptop",
    "masalah" TEXT NOT NULL,
    "penyelesaian" TEXT,
    "customerId" TEXT,
    "status" "StatusJob" NOT NULL DEFAULT 'DIKERJAKAN',
    "lunas" BOOLEAN NOT NULL DEFAULT false,
    "pembayaran" "MetodeBayar",
    "jumlah" INTEGER NOT NULL,
    "modalReparium" INTEGER NOT NULL,
    "persenKasLab" INTEGER NOT NULL DEFAULT 40,
    "transfer" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastaLot" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" "TipeLaptop" NOT NULL,
    "hargaTube" INTEGER NOT NULL,
    "jobPerTube" INTEGER NOT NULL,
    "sisaJob" INTEGER NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastaLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kategori" "KategoriPayout" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "dibayarAt" TIMESTAMP(3),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Instansi_nama_key" ON "Instansi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_noWa_key" ON "Customer"("noWa");

-- CreateIndex
CREATE INDEX "Customer_nama_idx" ON "Customer"("nama");

-- CreateIndex
CREATE INDEX "Customer_instansiId_idx" ON "Customer"("instansiId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_nama_key" ON "Person"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "RatePeriod_nama_key" ON "RatePeriod"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_ratePeriodId_tipe_key" ON "Rate"("ratePeriodId", "tipe");

-- CreateIndex
CREATE INDEX "ServiceJob_tanggalMasuk_idx" ON "ServiceJob"("tanggalMasuk");

-- CreateIndex
CREATE INDEX "ServiceJob_tanggalSelesai_idx" ON "ServiceJob"("tanggalSelesai");

-- CreateIndex
CREATE INDEX "ServiceJob_status_idx" ON "ServiceJob"("status");

-- CreateIndex
CREATE INDEX "ServiceJob_pjId_idx" ON "ServiceJob"("pjId");

-- CreateIndex
CREATE INDEX "ServiceJob_marketingId_idx" ON "ServiceJob"("marketingId");

-- CreateIndex
CREATE INDEX "RepairJob_tanggalMasuk_idx" ON "RepairJob"("tanggalMasuk");

-- CreateIndex
CREATE INDEX "RepairJob_status_idx" ON "RepairJob"("status");

-- CreateIndex
CREATE INDEX "PastaLot_tipe_idx" ON "PastaLot"("tipe");

-- CreateIndex
CREATE INDEX "Payout_periode_idx" ON "Payout"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_periode_personId_kategori_key" ON "Payout"("periode", "personId", "kategori");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_instansiId_fkey" FOREIGN KEY ("instansiId") REFERENCES "Instansi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_ratePeriodId_fkey" FOREIGN KEY ("ratePeriodId") REFERENCES "RatePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_pjId_fkey" FOREIGN KEY ("pjId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_marketingId_fkey" FOREIGN KEY ("marketingId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
