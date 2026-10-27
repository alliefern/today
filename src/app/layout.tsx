import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "today",
  description: "one calm checklist for today.",
  applicationName: "today",
  appleWebApp: { capable: true, title: "today", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff6f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
