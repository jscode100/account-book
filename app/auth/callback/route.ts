import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  // URL에서 구글이 보낸 암호(code)를 뽑아냅니다.
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    // 암호를 진짜 입장권(세션)으로 교환합니다.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 교환 성공 시 '대시보드'로 바로 이동시킵니다!
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // 에러가 나면 다시 메인 화면으로 돌려보냅니다.
  return NextResponse.redirect(`${origin}/`)
}