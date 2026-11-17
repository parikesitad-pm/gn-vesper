import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RepoWatchProvider } from "@/components/organisms/repo-provider/RepoWatchProvider";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vesper Notch — safe actions and grounded creator answers",
  description:
    "Vesper turns one line into a safe, allow-listed action — or an answer grounded in dap_'s public site, with citations. A standalone showcase with a visible intent and retrieval pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${sans.variable}`}><RepoWatchProvider>{children}</RepoWatchProvider></body>
    </html>
  );
}
