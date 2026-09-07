import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logic Circuits",
  description: "Build formal proofs among the stars. A Metamath logic circuit game with a celestial academy and floating gardens.",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
