import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// 모바일 화면 확대 방지 및 상태바 색상(화이트) 지정
export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

// 진짜 앱처럼 인식되도록 하는 메타데이터
export const metadata: Metadata = {
  title: '우리집 가계부',
  description: '우리 부부만의 자산 관리 파이프라인',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // 상단 와이파이/배터리 아이콘 영역을 깔끔하게
    title: '가계부',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}