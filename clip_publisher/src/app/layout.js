import "./globals.css";

export const metadata = {
  title: "ClipPilot",
  description: "Caption generator for gaming clips",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}