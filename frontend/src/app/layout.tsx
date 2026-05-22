import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeachGuard AI - 교사 권리 보호 및 심리 지원 서비스",
  description: "교권 침해 상황에 처한 교사들에게 신속한 정보, 맞춤형 가이드 및 심리 상담 지원을 제공합니다.",
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased selection:bg-brand-indigo-light selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
