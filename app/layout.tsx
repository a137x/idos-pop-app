import type { Metadata } from "next";
import { Orbitron, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { config } from "@/lib/wagmi-config";
import { ContextProvider } from "@/components/context-provider";

// OTER type roles — same trio as the oter.io landing and beacon pages
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

// OTER logomark favicon — 2x2 tile, one settled green cell (mirrors beacon)
const FAVICON =
  "data:image/svg+xml," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>" +
  "<rect width='16' height='16' fill='%23f7e8c6'/>" +
  "<rect x='1.5' y='1.5' width='6' height='6' fill='%232b261d'/>" +
  "<rect x='8.5' y='1.5' width='6' height='6' fill='%23768f4d'/>" +
  "<rect x='1.5' y='8.5' width='6' height='6' fill='%232b261d'/>" +
  "<rect x='8.5' y='8.5' width='6' height='6' fill='%232b261d'/>" +
  "</svg>";

export const metadata: Metadata = {
  title: "OTER PoP · Verify personhood",
  description:
    "Verify personhood via idOS FaceSign and receive your Proof-of-Personhood NFT on Radix — a soulbound badge any Radix dApp can gate on.",
  icons: { icon: FAVICON },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));

  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${inter.variable} ${spaceMono.variable}`}>
        <ContextProvider initialState={initialState}>{children}</ContextProvider>
      </body>
    </html>
  );
}
