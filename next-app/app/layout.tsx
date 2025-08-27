import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./provider";
import BeamsBackground from "@/components/Background";
import { Trademark } from "@/components/Trademark";


export const metadata: Metadata = {
  title: "Deciball - Sync the Beat, Vote the Heat!",
  description: "Create collaborative music spaces and vote on tracks together in real-time",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
<Providers>
{children}
<Trademark />
</Providers>
      </body>
    </html>
  );
}
