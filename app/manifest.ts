import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '부부 가계부',
    short_name: '가계부', // 바탕화면 아이콘 아래에 적힐 이름입니다.
    description: '우리 가계부',
    start_url: '/', // 앱을 켰을 때 처음 시작할 화면
    display: 'standalone', // 주소창을 없애고 찐 앱처럼 띄우는 핵심 마법!
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}