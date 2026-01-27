import "./globals.css";

export const metadata = {
  title: "ViralPack.ai, Generate viral content packs in minutes",
  description:
    "Enter 5 details, get an agency-ready pack, hooks, scripts, shot lists, overlays, captions, and top hashtags.",
  metadataBase: new URL("https://viralpack.ai"),
  openGraph: {
    title: "ViralPack.ai, Generate viral content packs in minutes",
    description:
      "Enter 5 details, get an agency-ready pack, hooks, scripts, shot lists, overlays, captions, and top hashtags.",
    url: "https://viralpack.ai",
    siteName: "ViralPack.ai",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ViralPack.ai",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ViralPack.ai, Generate viral content packs in minutes",
    description:
      "Enter 5 details, get an agency-ready pack, hooks, scripts, shot lists, overlays, captions, and top hashtags.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
