import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = DM_Sans({ subsets: ['latin'], variable: '--font-inter' })
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Kaizen — Communication without barriers',
  description: 'A browser-first ASL fingerspelling translator for more connected conversations.',
  generator: 'Kaizen',
  
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${display.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production'}
      </body>
    </html>
  )
}
