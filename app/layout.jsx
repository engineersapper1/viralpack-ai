import "./globals.css";

export const metadata = {
  title: "ViralPack.ai , Viral Content Packs in Minutes",
  description: "Enter 5 details, get scripts, shot lists, overlays, captions, and hashtags. Built for agencies and local businesses.",
  metadataBase: new URL("https://viralpack.ai")
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

