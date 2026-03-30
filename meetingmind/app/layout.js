import "./globals.css"
import { Providers } from "./providers"

export const metadata = {
  title: "MeetingMind",
  description: "Your meeting intelligence layer",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
