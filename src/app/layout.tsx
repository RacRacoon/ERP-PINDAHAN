import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});
const jb = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jb",
});

export const metadata: Metadata = {
  title: "B4 ERP",
  description: "Input dan monitoring B4 Service Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${plex.variable} ${jb.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
