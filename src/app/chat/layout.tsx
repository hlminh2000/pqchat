import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Ephem Chat",
  description: "Ephemeral p2p chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <style>
      {`
        /* We are stopping user from
        printing our webpage */
        @media print {

          html, body {

          /* Hide the whole page */
          display: none;
            }
        }
      `}
      </style>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
      <body>
        {children}
      </body>
    </html>
  );
}
