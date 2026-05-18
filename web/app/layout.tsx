import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "XīnHànzì — Học từ vựng tiếng Trung",
  description: "Ứng dụng học flashcard từ vựng tiếng Trung theo chuẩn HSK với thuật toán lặp lại ngắt quãng SM-2.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${notoSansSC.variable}`}>
      <body>{children}</body>
    </html>
  );
}
