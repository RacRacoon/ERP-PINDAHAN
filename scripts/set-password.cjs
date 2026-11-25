// Ganti password login: npm run password
// Membuat hash bcrypt dan menulisnya ke ADMIN_PASSWORD_HASH di .env (dengan escape \$ yang dibutuhkan Next).
// Di Vercel, salin hash yang dicetak di akhir (tanpa backslash) ke Environment Variables.
const fs = require("node:fs");
const readline = require("node:readline");
const bcrypt = require("bcryptjs");

const BS = String.fromCharCode(92);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Password baru (min. 8 karakter): ", (pw) => {
  rl.close();
  if (!pw || pw.length < 8) {
    console.error("Password minimal 8 karakter. Tidak ada yang diubah.");
    process.exit(1);
  }
  const hash = bcrypt.hashSync(pw, 10);
  const baris = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8").split("\n") : [];
  const sisa = baris.filter((l) => !l.startsWith("ADMIN_PASSWORD_HASH=") && l.trim() !== "");
  sisa.push("ADMIN_PASSWORD_HASH=" + hash.split("$").join(BS + "$"));
  fs.writeFileSync(".env", sisa.join("\n") + "\n");
  console.log("\n.env diperbarui. Restart `npm run dev` agar password baru berlaku.");
  console.log("\nUntuk Vercel, isi ADMIN_PASSWORD_HASH dengan:\n" + hash);
});
