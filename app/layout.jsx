import './globals.css';

export const metadata = {
  title: 'ViralPack Client Mailroom',
  description: 'Beta client email campaign room for ViralPack.ai'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
