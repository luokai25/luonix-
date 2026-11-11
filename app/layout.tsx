import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luonix Ø | AI Product Studio",
  description: "Turn ideas into finished digital products."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
