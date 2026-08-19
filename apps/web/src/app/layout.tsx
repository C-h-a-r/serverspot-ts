import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "@serverspot/ui/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ServerSpot",
    template: "%s | ServerSpot",
  },
  description:
    "Everything you need to run your game server website — store, community, support, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster theme="dark" position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
