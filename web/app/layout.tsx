import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeafGuard — Plant Disease Detection",
  description:
    "Upload a leaf photo to identify plant species, detect diseases, and get treatment recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <p className="w-full bg-leaf-800 py-1.5 text-center text-xs font-medium tracking-wide text-leaf-50">
          made by VG
        </p>
        {children}
      </body>
    </html>
  );
}
