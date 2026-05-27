'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay } from 'date-fns'
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Edit2, Calendar as CalendarIcon, ClipboardList, Settings } from 'lucide-react'

export default function Dashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  
  // 데이터 상태
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  // 온보딩 상태
  const [inviteCode, setInviteCode] = useState('')
  const [nickname, setNickname] = useState('')

  // UI 제어 상태
  const [activeTab, setActiveTab] = useState<'calendar' | 'all' | 'settings'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // 가계부 입력 폼 상태
  const [txType, setTxType] = useState('지출')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [txOwner, setTxOwner] = useState('공통') // ★ 신규 추가: 주체 구분 ('아내' | '남편' | '공통')

  // 카테고리 추가 폼 상태
  const [newCategoryType, setNewCategoryType] = useState('지출')
  const [newCategoryName, setNewCategoryName] = useState('')

  // 데이터 로드
  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: uData } = await supabase.from('users').select('*').eq('id', user.id).single()
      
      if (uData) {
        setDbUser(uData)
        
        // 카테고리 불러오기 및 시딩
        let { data: catData } = await supabase.from('categories').select('*').eq('household_id', uData.household_id)
        if (!catData || catData.length === 0) {
          const defaultCategories = [
            { household_id: uData.household_id, type: '수입', name: '사업소득' },
            { household_id: uData.household_id, type: '수입', name: '월급' },
            { household_id: uData.household_id, type: '수입', name: '기타' },
            { household_id: uData.household_id, type: '지출', name: '주거비' },
            { household_id: uData.household_id, type: '지출', name: '식비' },
            { household_id: uData.household_id, type: '지출', name: '가족' },
            { household_id: uData.household_id, type: '지출', name: '경조사비' },
            { household_id: uData.household_id, type: '지출', name: '생필품기타' },
            { household_id: uData.household_id, type: '지출', name: '쇼핑' },
            { household_id: uData.household_id, type: '지출', name: '공과금' },
            { household_id: uData.household_id, type: '지출', name: '약속친구' },
            { household_id: uData.household_id, type: '지출', name: '학자금' },
            { household_id: uData.household_id, type: '지출', name: '미용' },
            { household_id: uData.household_id, type: '지출', name: '교통' },
            { household_id: uData.household_id, type: '지출', name: '통신' },
            { household_id: uData.household_id, type: '지출', name: '보험료' },
            { household_id: uData.household_id, type: '지출', name: '건강' },
            { household_id: uData.household_id, type: '지출', name: '데이트' },
          ]
          await supabase.from('categories').insert(defaultCategories)
          const { data: reCatData } = await supabase.from('categories').select('*').eq('household_id', uData.household_id)
          catData = reCatData
        }
        setCategories(catData || [])

        // 내역 불러오기
        const startStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const endStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
        const { data: txData } = await supabase
          .from('transactions')
          .select('*, categories(name)')
          .eq('household_id', uData.household_id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true })

        setTransactions(txData || [])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [currentMonth])

  useEffect(() => {
    const filtered = categories.filter(c => c.type === txType)
    if (filtered.length > 0) {
      setSelectedCategoryId(filtered[0].id)
    } else {
      setSelectedCategoryId('')
    }
  }, [txType, categories, isModalOpen])

  // --- 온보딩 시스템 ---
  const createHousehold = async () => {
    if (!nickname) return alert('닉네임을 입력해주세요.')
    const { data: household } = await supabase.from('households').insert({}).select().single()
    if (household) {
      await supabase.from('users').insert({ id: user.id, household_id: household.id, nickname })
      window.location.reload()
    }
  }

  const joinHousehold = async () => {
    if (!nickname || !inviteCode) return alert('닉네임과 초대코드를 모두 입력해주세요.')
    await supabase.from('users').insert({ id: user.id, household_id: inviteCode.trim(), nickname })
    window.location.reload()
  }

  // 내역 모달 열기 함수 제어 (디폴트 구분값 매핑)
  const openCreateModal = () => {
    setModalMode('create')
    setAmount('')
    setMemo('')
    
    // ★ 폰의 주인(닉네임)에 맞게 기본 타겟 자동 설정
    if (dbUser.nickname.includes('아내') || dbUser.nickname.includes('소은')) {
      setTxOwner('아내')
    } else if (dbUser.nickname.includes('남편') || dbUser.nickname.includes('제이스')) {
      setTxOwner('남편')
    } else {
      setTxOwner('공통')
    }
    setIsModalOpen(true)
  }

  // 저장 및 수정
  const saveTransaction = async () => {
    if (!amount) return alert('금액을 입력해주세요.')
    
    const txData = {
      household_id: dbUser.household_id,
      user_id: user.id,
      type: txType,
      amount: Number(amount),
      category_id: selectedCategoryId || null,
      date: format(selectedDate, 'yyyy-MM-dd'),
      description: memo,
      owner: txOwner // ★ DB에 구분 값 함께 전송
    }

    if (modalMode === 'edit' && editingTxId) {
      await supabase.from('transactions').update(txData).eq('id', editingTxId)
    } else {
      await supabase.from('transactions').insert(txData)
    }
    
    setIsModalOpen(false)
    setEditingTxId(null)
    loadData()
  }

  const openEditModal = (tx: any) => {
    setModalMode('edit')
    setEditingTxId(tx.id)
    setSelectedDate(new Date(tx.date))
    setTxType(tx.type)
    setAmount(tx.amount.toString())
    setMemo(tx.description || '')
    setSelectedCategoryId(tx.category_id || '')
    setTxOwner(tx.owner || '공통') // 수정 시 기존 설정값 불러오기
    setIsModalOpen(true)
  }

  const deleteTransaction = async (id: string) => {
    if (!confirm('이 내역을 정말 삭제하시겠습니까?')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadData()
  }

  // 카테고리 관리
  const addCustomCategory = async () => {
    if (!newCategoryName) return alert('카테고리명을 입력해주세요.')
    await supabase.from('categories').insert({ household_id: dbUser.household_id, type: newCategoryType, name: newCategoryName })
    setNewCategoryName('')
    loadData()
  }

  const deleteCustomCategory = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return
    await supabase.from('categories').delete().eq('id', id)
    loadData()
  }

  // 이모지 변환기 매핑용 헬퍼 함수
  const getOwnerEmoji = (owner: string) => {
    if (owner === '아내') return '🩷'
    if (owner === '남편') return '💙'
    return '👩🏻‍❤️‍👨🏻'
  }

  // 금액 계산기
  const totalIncome = transactions.filter(t => t.type === '수입').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0)
  const remainingMoney = totalIncome - totalExpense

  const firstDayOfMonth = startOfMonth(currentMonth)
  const lastDayOfMonth = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth })
  const startingDayIndex = getDay(firstDayOfMonth)
  const emptyDays = Array.from({ length: startingDayIndex })

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayTransactions = transactions.filter(t => t.date === selectedDateStr)
  const allRecentTransactions = [...transactions].reverse()

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">로딩 중...</div>

  if (!dbUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">환영합니다!</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">사용할 닉네임</label>
            <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <button onClick={createHousehold} className="w-full bg-gray-800 text-white rounded-xl py-2.5 font-medium">새 가계부 만들기</button>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 mb-3 text-sm" placeholder="초대코드 입력" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
              <button onClick={joinHousehold} className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-2.5 font-medium">연결하기</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36 relative">
      <div className="max-w-xl mx-auto space-y-6 p-6">
        
        {/* 상단 헤더 */}
        <header className="flex justify-between items-center py-2">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            {activeTab === 'calendar' ? '자산 흐름' : activeTab === 'all' ? '전체 이력' : '가계부 설정'}
          </h1>
          <div className="text-sm bg-white px-4 py-2 rounded-full border border-gray-200 text-gray-600 shadow-sm font-medium">
            {dbUser.nickname}님
          </div>
        </header>

        {/* [탭 1] 달력 메인 뷰 */}
        {activeTab === 'calendar' && (
          <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-medium mb-1">이번 달 남은 잉여 자금</p>
              <p className="text-3xl font-bold text-gray-800 mb-4">₩ {remainingMoney.toLocaleString()}</p>
              <div className="flex gap-4 text-sm">
                <div className="flex-1 bg-blue-50/50 p-3 rounded-2xl">
                  <p className="text-blue-600/70 font-medium mb-1">수입</p>
                  <p className="font-semibold text-blue-900">₩ {totalIncome.toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-gray-50/50 p-3 rounded-2xl">
                  <p className="text-gray-500 font-medium mb-1">지출 합계</p>
                  <p className="font-semibold text-gray-800">₩ {totalExpense.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-400"/></button>
                <h2 className="text-lg font-bold text-gray-800">{format(currentMonth, 'yyyy년 M월')}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight size={20} className="text-gray-400"/></button>
              </div>

              <div className="grid grid-cols-7 gap-y-4 text-center">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="text-xs font-semibold text-gray-400 mb-2">{day}</div>
                ))}
                {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayTx = transactions.filter(t => t.date === dateStr)
                  const dayIncome = dayTx.filter(t => t.type === '수입').reduce((sum, t) => sum + t.amount, 0)
                  const dayExpense = dayTx.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0)
                  const isSelected = isSameDay(day, selectedDate)

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center justify-between min-h-[56px] pt-1 pb-1 cursor-pointer rounded-xl transition-all ${
                        isSelected ? 'bg-gray-900 text-white shadow-md ring-2 ring-gray-900' : isToday(day) ? 'bg-blue-50/50 border border-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`text-xs font-semibold ${isSelected ? 'text-white' : isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-col text-[10px] w-full px-0.5 transform scale-90 origin-center leading-tight">
                        {dayIncome > 0 && <span className={isSelected ? 'text-blue-200 font-bold' : 'text-blue-500 font-bold'}>+{dayIncome.toLocaleString()}</span>}
                        {dayExpense > 0 && <span className={isSelected ? 'text-gray-300' : 'text-gray-400 font-medium'}>-{dayExpense.toLocaleString()}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 선택일 상세 내역 패널 */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4">{format(selectedDate, 'M월 d일')} 내역</h3>
              <div className="space-y-1">
                {selectedDayTransactions.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">이날의 내역이 없습니다.</p>
                ) : (
                  selectedDayTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-2">
                        {/* ★ 신규 추가: 주체에 따른 이모지 라벨 표기 */}
                        <span className="text-base mr-1">{getOwnerEmoji(tx.owner)}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800">{tx.description || '내용 없음'}</span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500 mr-1">
                              {tx.categories?.name || '미분류'}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm mr-2 ${tx.type === '수입' ? 'text-blue-500' : 'text-gray-700'}`}>
                          {tx.type === '수입' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </span>
                        <button onClick={() => openEditModal(tx)} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={15} /></button>
                        <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* [탭 2] 전체 이력 뷰 */}
        {activeTab === 'all' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="space-y-1">
              {allRecentTransactions.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">입력된 내역이 없습니다.</p>
              ) : (
                allRecentTransactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      {/* ★ 전체 이력 뷰에도 이모지 적용 */}
                      <span className="text-base mr-1">{getOwnerEmoji(tx.owner)}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">{tx.description || '내용 없음'}</span>
                        <span className="text-xs text-gray-400 mt-0.5">
                          <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500 mr-1.5">
                            {tx.categories?.name || '미분류'}
                          </span>
                          {format(new Date(tx.date), 'M월 d일')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm mr-2 ${tx.type === '수입' ? 'text-blue-500' : 'text-gray-700'}`}>
                        {tx.type === '수입' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </span>
                      <button onClick={() => openEditModal(tx)} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={15} /></button>
                      <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* [탭 3] 카테고리 및 정보 설정 뷰 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-700 mb-2">배우자 초대코드</h2>
              <p className="text-xs text-gray-500 break-all bg-gray-50 p-3 rounded-xl border border-gray-100 font-mono select-all cursor-pointer">{dbUser.household_id}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-base font-bold text-gray-800">카테고리 추가/삭제</h3>
              <div className="flex gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <select value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 text-xs font-bold text-gray-700 focus:outline-none">
                  <option value="지출">지출</option>
                  <option value="수입">수입</option>
                </select>
                <input type="text" placeholder="새 분류 이름" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                <button onClick={addCustomCategory} className="bg-gray-900 text-white text-xs px-4 rounded-xl font-bold hover:bg-gray-800 transition-colors">추가</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-500 mb-2">💰 수입 소분류</h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {categories.filter(c => c.type === '수입').map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-xs text-gray-700 border border-gray-100">
                        <span>{c.name}</span>
                        <button onClick={() => deleteCustomCategory(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-2">💸 지출 소분류</h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {categories.filter(c => c.type === '지출').map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-xs text-gray-700 border border-gray-100">
                        <span>{c.name}</span>
                        <button onClick={() => deleteCustomCategory(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 플로팅 입력 버튼 */}
      {activeTab !== 'settings' && (
        <button 
          onClick={openCreateModal} // 전용 오픈 함수로 변경
          className="fixed bottom-24 right-6 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-transform hover:scale-105 z-40"
        >
          <Plus size={24} />
        </button>
      )}

      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 py-3 px-6 flex justify-around items-center z-40 shadow-lg max-w-xl mx-auto sm:rounded-t-3xl">
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'calendar' ? 'text-gray-900' : 'text-gray-400'}`}>
          <CalendarIcon size={20} /><span className="text-[10px] font-bold">달력</span>
        </button>
        <button onClick={() => setActiveTab('all')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'all' ? 'text-gray-900' : 'text-gray-400'}`}>
          <ClipboardList size={20} /><span className="text-[10px] font-bold">전체 이력</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-gray-900' : 'text-gray-400'}`}>
          <Settings size={20} /><span className="text-[10px] font-bold">설정</span>
        </button>
      </nav>

      {/* 입력 및 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">{format(selectedDate, 'M월 d일')} {modalMode === 'edit' ? '내역 수정' : '내역 추가'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              {['지출', '수입'].map(type => (
                <button key={type} onClick={() => setTxType(type)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${txType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{type}</button>
              ))}
            </div>

            <div className="space-y-5 mb-8">
              {/* ★ 신규 추가: 기획하신 주체 구분 3단 토글 세그먼트 버튼 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">누가 썼나요? (내역 구분)</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                  {[
                    { value: '아내', label: '🩷 아내' },
                    { value: '남편', label: '💙 남편' },
                    { value: '공통', label: '👩🏻‍❤️‍👨🏻 공통' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTxOwner(opt.value)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        txOwner === opt.value 
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-100 scale-[1.02]' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">카테고리 분류</label>
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-gray-200">
                  {categories.filter(c => c.type === txType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">금액</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-b-2 border-gray-100 pb-2 focus:outline-none focus:border-blue-500 transition-colors" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">내용</label>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모를 입력하세요" className="w-full text-base text-gray-800 placeholder-gray-400 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
            </div>

            <button onClick={saveTransaction} className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl hover:bg-gray-800 transition-colors">
              {modalMode === 'edit' ? '수정완료' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}