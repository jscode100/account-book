'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Upload } from 'lucide-react'

export default function MigratePage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [status, setStatus] = useState('데이터를 불러오는 중입니다...')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setStatus('오류: 구글 로그인이 풀려있습니다. 메인 화면에서 로그인해주세요.')
      setUser(user)

      const { data: uData } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (!uData) return setStatus('오류: 가계부 설정 내역을 찾을 수 없습니다.')
      setDbUser(uData)

      const { data: catData } = await supabase.from('categories').select('*').eq('household_id', uData.household_id)
      setCategories(catData || [])
      setStatus('✅ 준비 완료! 엑셀(CSV) 파일을 아래에 업로드해주세요.')
    }
    init()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // ★ 핵심: 파일을 낚아채자마자 입력창을 강제로 텅 비워줍니다!
    
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      if (!text) return

      // CSV 정밀 파서 (메모에 쉼표가 섞여있어도 보호)
      const arr: string[][] = []
      let quote = false
      let row = 0, col = 0
      for (let c = 0; c < text.length; c++) {
          let cc = text[c], nc = text[c+1]
          arr[row] = arr[row] || []
          arr[row][col] = arr[row][col] || ''
          if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
          if (cc === '"') { quote = !quote; continue; }
          if (cc === ',' && !quote) { ++col; continue; }
          if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
          if (cc === '\n' && !quote) { ++row; col = 0; continue; }
          if (cc === '\r' && !quote) { ++row; col = 0; continue; }
          arr[row][col] += cc
      }

      // 첫 줄(헤더) 제외 및 빈 줄 필터링
      const dataRows = arr.slice(1).filter(r => r.length >= 6 && r[0].trim() !== '')
      const insertData = []

      for (let i = 0; i < dataRows.length; i++) {
        // [주의] 엑셀 열 순서가 반드시 아래와 같아야 합니다:
        // A:날짜 / B:분류 / C:주체 / D:카테고리 / E:내용 / F:금액
        const [date, type, owner, categoryName, memo, amountStr] = dataRows[i]
        const rowNum = i + 2 

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return alert(`[엑셀 ${rowNum}행 오류] 날짜 형식(YYYY-MM-DD)을 확인해주세요: ${date}`)
        if (!['수입', '지출'].includes(type.trim())) return alert(`[엑셀 ${rowNum}행 오류] 분류(수입/지출)를 확인해주세요: ${type}`)
        if (!['아내', '남편', '공통'].includes(owner.trim())) return alert(`[엑셀 ${rowNum}행 오류] 주체(아내/남편/공통)를 확인해주세요: ${owner}`)
        
        // 카테고리명 DB와 대조
        const cat = categories.find(c => c.name === categoryName.trim() && c.type === type.trim())
        if (!cat) return alert(`[엑셀 ${rowNum}행 오류] 등록되지 않은 카테고리입니다.\n앱에 있는 이름과 엑셀 이름이 정확히 일치하는지 확인하세요: [${categoryName.trim()}]`)
        
        const amount = Number(amountStr.replace(/,/g, ''))
        if (isNaN(amount)) return alert(`[엑셀 ${rowNum}행 오류] 금액은 숫자여야 합니다: ${amountStr}`)

        insertData.push({
          household_id: dbUser.household_id,
          user_id: user.id,
          type: type.trim(),
          amount: amount,
          category_id: cat.id,
          date: date.trim(),
          description: memo.trim(),
          owner: owner.trim()
        })
      }

      if (insertData.length === 0) return alert('업로드할 유효한 데이터가 없습니다.')
      if (!confirm(`🎉 검증 완료! 에러가 없습니다.\n총 ${insertData.length}건의 데이터를 DB로 쏠까요?`)) return

      setStatus('데이터 업로드 중... 창을 닫지 마세요!')
      const { error } = await supabase.from('transactions').insert(insertData)
      
      if (error) {
          alert('오류 발생: ' + error.message)
          setStatus('업로드 실패')
      } else {
          alert('성공적으로 과거 이력이 모두 연동되었습니다!')
          setStatus('🎉 업로드 성공! 이제 이 페이지(app/migrate 폴더)를 삭제하셔도 됩니다.')
      }
      e.target.value = ''
    }
    // 엑셀에서 뽑은 CSV의 한글 깨짐 방지를 위한 디코딩
    reader.readAsText(file, 'euc-kr') 
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">1회성 과거 내역 이관기</h1>
        <p className="text-sm font-medium text-gray-600 bg-blue-50 text-blue-700 p-4 rounded-xl">{status}</p>
        
        <div className="text-left text-xs text-gray-500 bg-gray-50 p-4 rounded-xl space-y-2">
          <p className="font-bold text-gray-700 mb-1">⚠️ 엑셀(CSV) 파일 필수 규칙</p>
          <p>1. 열 순서: <b>날짜 | 분류 | 주체 | 카테고리 | 내용 | 금액</b></p>
          <p>2. 날짜는 무조건 <code className="bg-gray-200 px-1 rounded">2026-05-15</code> 형태</p>
          <p>3. 카테고리는 앱에 있는 이름과 띄어쓰기까지 똑같을 것</p>
          <p>4. 엑셀에서 <b>'CSV (쉼표로 분리)'</b>로 저장된 파일일 것</p>
        </div>
        
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <Upload size={32} className="text-gray-400 mb-2" />
          <span className="text-sm font-semibold text-gray-600">클릭하여 CSV 파일 선택</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={!dbUser} />
        </label>
      </div>
    </div>
  )
}