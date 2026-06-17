'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleSignUp = async () => {
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.')
    if (password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.')
    
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      alert('회원가입 실패: ' + error.message)
    } else {
      alert('가입이 완료되었습니다! 이제 로그인을 눌러주세요.')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.')
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      alert('로그인 실패: 이메일이나 비밀번호를 확인해주세요.')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">💸</div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">우리집 가계부</h1>
          <p className="text-sm text-gray-500 mt-2">안전하고 간편한 자산 관리</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">이메일</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">비밀번호 (6자리 이상)</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="pt-4 space-y-3">
            <button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gray-900 text-white font-bold text-base py-3.5 rounded-2xl hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {loading ? '처리 중...' : '로그인'}
            </button>
            <button 
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-white text-gray-700 font-bold text-base py-3.5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:bg-gray-100"
            >
              새로 시작하기 (회원가입)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}