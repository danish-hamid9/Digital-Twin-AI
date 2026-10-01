import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/authContext';
import { ThemeProvider } from '@/lib/themeContext';

export const metadata: Metadata = {
  title: 'Digital Twin AI – Personal Life Simulation & Decision Assistant',
  description: 'AI-driven digital twin that predicts your trajectory across finance, study, and wellbeing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

