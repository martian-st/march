// import React from 'react'
// import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
// import '../styles/globals.css'
// // import Navbar from '../components/Navbar'

// const inter = Inter({ subsets: ['latin'] })

// export const metadata: Metadata = {
//   title: 'march',
//   description: 'ai second brain, opinionatedly designed for the rest of us',
//   icons: {
//     icon: '/favicon.ico',
//   },
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en">
//       <body className={`${inter.className} min-h-screen bg-white`}>
//         {/* <Navbar /> */}
//         <main className="pt-20">
//           {children}
//         </main>
//       </body>
//     </html>
//   )
// }

import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'march',
  description: 'ai second brain, opinionatedly designed for makers',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}