import type { Metadata } from "next";
import { Mona_Sans, Oranienbaum } from "next/font/google";
import "../globals.css";

const monaSans = Mona_Sans({ variable: "--font-sans", subsets: ["latin"] });
const oranienbaum = Oranienbaum({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = { title: "Taro Root: Order" };

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${monaSans.variable} ${oranienbaum.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
