import { describe, expect, it } from "vitest";
import { bacaKontak, daftarKontak, jenisKontak, kontakUtama, normalisasiInstagram } from "./kontak";

describe("jenis kontak", () => {
  it("angka dan tanda telepon = WA", () => {
    expect(jenisKontak("0812-3456-7890")).toBe("wa");
    expect(jenisKontak("+62 812 3456 7890")).toBe("wa");
    expect(jenisKontak("(0812) 3456")).toBe("wa");
  });

  it("ada huruf atau @ = Instagram", () => {
    expect(jenisKontak("@rakan.b401")).toBe("ig");
    expect(jenisKontak("rakan_b401")).toBe("ig");
    expect(jenisKontak("instagram.com/rakan")).toBe("ig");
  });

  it("kosong = tidak ada jenis", () => {
    expect(jenisKontak("   ")).toBeNull();
  });
});

describe("normalisasi Instagram", () => {
  it("membuang @, huruf besar, dan spasi pinggir", () => {
    expect(normalisasiInstagram("  @Rakan.B401 ")).toBe("rakan.b401");
  });

  it("menerima link profil, juga dengan parameter", () => {
    expect(normalisasiInstagram("https://www.instagram.com/rakan.b401/?igsh=abc")).toBe("rakan.b401");
    expect(normalisasiInstagram("instagram.com/rakan_b401")).toBe("rakan_b401");
  });

  it("menolak karakter yang tidak dipakai Instagram dan nama terlalu panjang", () => {
    expect(normalisasiInstagram("@rakan b401")).toBeNull();
    expect(normalisasiInstagram("@rakan-b401")).toBeNull();
    expect(normalisasiInstagram("@")).toBeNull();
    expect(normalisasiInstagram("@" + "a".repeat(31))).toBeNull();
  });
});

describe("baca kontak", () => {
  it("nomor 08xx menjadi 62xx", () => {
    expect(bacaKontak("0812-3516-1803")).toEqual({ ok: true, kontak: { noWa: "6281235161803", instagram: null } });
  });

  it("@username menjadi Instagram tanpa nomor", () => {
    expect(bacaKontak("@Akhtar_01")).toEqual({ ok: true, kontak: { noWa: null, instagram: "akhtar_01" } });
  });

  it("nomor yang tidak masuk akal ditolak dengan petunjuk memakai @", () => {
    const r = bacaKontak("12345");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.pesan).toMatch(/awali dengan @/);
  });

  it("username semua angka harus diawali @, kalau tidak dibaca sebagai nomor", () => {
    expect(bacaKontak("@123456")).toEqual({ ok: true, kontak: { noWa: null, instagram: "123456" } });
    expect(bacaKontak("123456").ok).toBe(false);
  });
});

describe("tampilan", () => {
  it("WA lebih dulu, lalu Instagram", () => {
    expect(daftarKontak({ noWa: "6281235161803", instagram: "fakhruddin" })).toEqual(["081235161803", "@fakhruddin"]);
  });

  it("hanya Instagram", () => {
    expect(daftarKontak({ noWa: null, instagram: "akhtar_01" })).toEqual(["@akhtar_01"]);
    expect(kontakUtama({ noWa: null, instagram: "akhtar_01" })).toBe("@akhtar_01");
  });

  it("tanpa kontak sama sekali", () => {
    expect(kontakUtama({ noWa: null, instagram: null })).toBe("");
  });
});
