import "./globals.css";

export const metadata = {
  title: "ViralPack V3",
  description: "AI quiz funnel engine for viral psychological tests and premium results.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
