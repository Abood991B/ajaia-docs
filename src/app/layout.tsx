import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted so the production build never depends on reaching Google Fonts.
 * Files were pulled from the Google Fonts CSS API at latin-subset, variable
 * weight, and live in ./fonts.
 */
const ui = localFont({
  src: "./fonts/archivo-var.woff2",
  variable: "--font-ui",
  weight: "400 700",
  style: "normal",
  display: "swap",
});

const doc = localFont({
  src: [
    { path: "./fonts/literata-var.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/literata-var-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-doc",
  display: "swap",
});

const plex = localFont({
  src: [
    { path: "./fonts/plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-mono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description:
    "A focused collaborative editor: create, write, import and share documents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${doc.variable} ${plex.variable}`}>
        {children}
      </body>
    </html>
  );
}
