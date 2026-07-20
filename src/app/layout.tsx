import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logic Circuits",
  description: "A visual logic circuit puzzle game",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
