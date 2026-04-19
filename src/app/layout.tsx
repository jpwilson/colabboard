import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter, Caveat, IBM_Plex_Mono, Nunito } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { CookieConsentBanner } from '@/components/ui/CookieConsentBanner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })
const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  title: 'Orim - Collaborative Whiteboard',
  description: 'Real-time collaborative whiteboard platform with AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('orim-theme');var isDark=t==='dark'||(!t&&false)||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(isDark){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${caveat.variable} ${ibmPlexMono.variable} ${nunito.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <CookieConsentBanner />
        </ThemeProvider>
        <a
          href="https://www.hetzner.com/cloud"
          target="_blank"
          rel="noopener noreferrer"
          title="Self-hosted on Hetzner Cloud (ARM) via Coolify — migrated off Vercel+Supabase Cloud to cut demo hosting costs"
          style={{
            position: "fixed",
            bottom: 12,
            left: 12,
            zIndex: 9999,
            background: "rgba(17, 24, 39, 0.85)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 9999,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          🏠 Hetzner · Coolify
        </a>
      </body>
    </html>
  )
}
