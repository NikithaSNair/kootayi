import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "കൂട്ടായി — Help on demand, no monthly salary",
  description:
    "Speak your need in English, Malayalam or Manglish. കൂട്ടായി finds verified cooks, cleaners, electricians and plumbers near you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-200 text-slate-900 antialiased">
        <div className="mx-auto min-h-screen max-w-md bg-slate-50 shadow-xl">{children}</div>
      </body>
    </html>
  );
}
