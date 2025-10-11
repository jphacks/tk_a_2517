export const metadata = {
  title: 'Minimal App',
  description: 'A minimal Next.js app for Docker test',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
