import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { config } from "@/lib/wagmi-config";
import { ContextProvider } from "@/components/context-provider";

const urbanist = Urbanist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Radix | idOS Proof-of-Personhood",
  description: "Complete the Proof-of-Personhood process to receive your idOS Proof-of-Personhood NFT on Radix",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));

  return (
    <html lang="en">
      <body className={urbanist.className}>
        <ContextProvider initialState={initialState}>{children}</ContextProvider>
      </body>
    </html>
  );
}
