import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseForge | AI Music Production Studio",
  description: "Generate professional EDM tracks with AI. Visual composition, voice-to-instrument, and natural language synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}
