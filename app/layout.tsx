import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://landingroast.com"

const TITLE = "LandingRoast – AI Landing Page Audit"
const DESCRIPTION =
  "Paste your landing page URL and get an instant AI-powered conversion audit — score, roast, copy rewrites and CTA improvements in seconds. Free."

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: TITLE,
    template: "%s – LandingRoast",
  },
  description: DESCRIPTION,

  keywords: [
    "landing page audit",
    "landing page analyzer",
    "CRO tool",
    "conversion rate optimization",
    "AI copywriting",
    "roast my landing page",
    "landing page feedback",
    "CTA optimization",
    "AI marketing",
  ],

  authors: [{ name: "LandingRoast", url: BASE_URL }],

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    siteName: "LandingRoast",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "LandingRoast – AI Landing Page Audit",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@landingroast",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
