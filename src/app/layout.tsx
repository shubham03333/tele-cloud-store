import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa-register";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nimbus Drive",
  description: "Personal cloud storage powered by Telegram MTProto",
  applicationName: "Nimbus Drive",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nimbus Drive",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#05060a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased mesh-bg`}>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
          <Toaster position="top-center" offset={16} />
        </AppProviders>
      </body>
    </html>
  );
}
