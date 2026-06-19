import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collectiverse | Sell Cards',
  description: 'Sell your Pokémon cards to Collectiverse.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}