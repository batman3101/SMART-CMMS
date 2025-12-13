import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Sparkles, Loader2, Trash2, Clock } from 'lucide-react'
import { aiApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

// 다국어 샘플 질문
const sampleQuestionsData = {
  ko: [
    '이번 주 가장 많이 고장난 설비는?',
    'PM 일정이 다가오는 설비 목록',
    '평균 수리 시간이 가장 긴 수리 유형은?',
    '긴급수리 건수 추이 분석',
    '설비 가동률 현황',
    '이번 달 수리 통계 요약',
  ],
  vi: [
    'Thiết bị nào hỏng nhiều nhất tuần này?',
    'Danh sách thiết bị sắp đến lịch PM',
    'Loại sửa chữa nào có thời gian trung bình dài nhất?',
    'Phân tích xu hướng số lượng sửa chữa khẩn cấp',
    'Tình trạng hoạt động thiết bị',
    'Tóm tắt thống kê sửa chữa tháng này',
  ],
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIChatPage() {
  const { t, i18n } = useTranslation()
  const { language } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 현재 언어에 맞는 샘플 질문
  const sampleQuestions = useMemo(() => {
    const lang = language || i18n.language || 'ko'
    return sampleQuestionsData[lang as keyof typeof sampleQuestionsData] || sampleQuestionsData.ko
  }, [language, i18n.language])

  // 초기 메시지 설정
  useEffect(() => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: t('ai.welcomeMessage'),
        timestamp: new Date(),
      },
    ])
  }, [t])

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const currentLang = language || i18n.language || 'ko'
      const { data, error } = await aiApi.chat(input, currentLang)

      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error || data?.response || t('ai.responseFailed'),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    } catch {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: t('ai.responseError'),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSampleQuestion = (question: string) => {
    setInput(question)
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: t('ai.chatCleared'),
        timestamp: new Date(),
      },
    ])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('ai.chat')}</h1>
        <Button variant="outline" size="sm" onClick={handleClearChat} className="h-9 px-3">
          <Trash2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('common.clearChat')}</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        {/* Chat Area */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-[400px] sm:h-[500px] space-y-3 sm:space-y-4 overflow-y-auto p-3 sm:p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-2 sm:p-3 ${
                      message.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-xs sm:text-sm">{message.content}</p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-[10px] sm:text-xs ${
                        message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                      }`}
                    >
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2 sm:p-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      {t('common.generatingResponse')}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-3 sm:p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai.askQuestion')}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-sm"
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="h-9 sm:h-10 px-3 sm:px-4">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Questions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('common.sampleQuestions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {sampleQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto w-full justify-start px-2 sm:px-4 py-2 sm:py-3 text-left"
                    onClick={() => handleSampleQuestion(question)}
                    disabled={isLoading}
                  >
                    <span className="text-xs sm:text-sm line-clamp-2">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 사용 팁 */}
          <Card className="hidden sm:block">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">{t('common.usageTips')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li>• {t('ai.tip1')}</li>
                <li>• {t('ai.tip2')}</li>
                <li>• {t('ai.tip3')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
