export const metadata = {
  title: 'Minimal App',
  description: 'A minimal Next.js app for Docker test',
}

import SiteHeader from './components/SiteHeader'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/css/header.css" />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
