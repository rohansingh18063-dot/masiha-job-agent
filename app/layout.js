import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import Footer from "./_components/Footer";

const sora = localFont({
  src: [
    { path: "./fonts/sora-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/sora-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-sora",
  display: "swap",
});

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Masiha Job Agent — Build your resume and reach HR teams in your city",
  description:
    "Create a professional resume in minutes, then send a personal email to HR teams of companies in your city, one click at a time. Free to use.",
};

export const viewport = { themeColor: "#0B0A1A" };

export default async function RootLayout({ children }) {
  // Reading the request makes every page render per request, which the per-page CSP nonce needs (see proxy.js).
  await headers();
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
