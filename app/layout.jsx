import "./globals.css";

export const metadata = {
  title: "ViralPack.ai",
  description: "Generate viral content packs in minutes, built to be fast, specific, and shootable.",
  metadataBase: new URL("https://viralpack.ai"),
  openGraph: {
    title: "ViralPack.ai",
    description: "Generate viral content packs in minutes, built to be fast, specific, and shootable.",
    url: "https://viralpack.ai",
    siteName: "ViralPack.ai",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ViralPack.ai" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ViralPack.ai",
    description: "Generate viral content packs in minutes, built to be fast, specific, and shootable.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/favicon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="vp-bg">
          <div className="vp-bg__img" />
          <div className="vp-bg__overlay" />
          <div className="vp-foreground">{children}</div>
        </div>
      </body>
    </html>
  );
}