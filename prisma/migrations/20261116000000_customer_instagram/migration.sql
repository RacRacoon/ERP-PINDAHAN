-- Customer bisa dikenali lewat nomor WA atau akun Instagram. Perubahan hanya menambah, tidak ada data yang berubah.
ALTER TABLE "Customer" ALTER COLUMN "noWa" DROP NOT NULL;
ALTER TABLE "Customer" ADD COLUMN "instagram" TEXT;
CREATE UNIQUE INDEX "Customer_instagram_key" ON "Customer"("instagram");
