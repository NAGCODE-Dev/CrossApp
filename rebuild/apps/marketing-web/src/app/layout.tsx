import type { ReactNode } from "react";

export const metadata = {
  title: "Ryxen",
  description: "Superficie publica reescrita do Ryxen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#0b0f14",
          color: "#f5f7fb",
          fontFamily: "sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
