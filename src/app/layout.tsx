import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verkaufshilfe via Foto',
  description: 'Inserat für ricardo.ch automatisch erstellen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
