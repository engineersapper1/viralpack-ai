import "./globals.css";

export const metadata = {
  title: "ViralPack.ai , Viral content packs in minutes",
  description:
    "Enter 5 details. Get scripts, shot lists, overlays, captions, and hashtags. Built for agencies and local businesses.",
  metadataBase: new URL("https://viralpack.ai"),

  icons: {
    icon: "/favicon.png"
  },

  openGraph: {
    title: "ViralPack.ai",
    description: "Let AI spark your social media posts",
    url: "https://viralpack.ai",
    siteName: "ViralPack.ai",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ViralPack.ai OG Image"
      }
    ],
    locale: "en_US",
    type: "website"
  },

  twitter: {
    card: "summary_large_image",
    title: "ViralPack.ai",
    description: "Let AI spark your social media posts",
    images: ["/og.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}