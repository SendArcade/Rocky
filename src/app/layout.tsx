import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Head from "next/head"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* HTML Meta Tags */}
        <title>Rock Paper Scissors</title>
        <meta name="description" content="Play Rock Paper Scissors for a chance to win 2x in SEND" />

        {/* Facebook Meta Tags */}
        <meta property="og:url" content="https://rps.sendarcade.fun" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Rock Paper Scissors" />
        <meta property="og:description" content="Play Rock Paper Scissors for a chance to win 2x in SEND" />
        <meta
          property="og:image"
          content="https://rps.sendarcade.fun/og.png"
        />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="rps.sendarcade.fun" />
        <meta property="twitter:url" content="https://rps.sendarcade.fun" />
        <meta name="twitter:title" content="Rock Paper Scissors" />
        <meta name="twitter:description" content="Play Rock Paper Scissors for a chance to win 2x in SEND" />
        <meta
          name="twitter:image"
          content="https://rps.sendarcade.fun/og.png"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
