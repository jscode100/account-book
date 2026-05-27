'use client'

import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const supabase = createClient()

  const handleLogin = async () => {
    // 구글 로그인 창을 띄워달라고 Supabase에 요청하는 코드입니다.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">부부 가계부</h1>
        <p className="text-gray-500 mb-8 font-medium">우리만의 자산 관리 파이프라인</p>
        
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl shadow-sm font-medium hover:bg-gray-50 transition-colors"
        >
          구글로 시작하기
        </button>
      </div>
    </div>
  )
}