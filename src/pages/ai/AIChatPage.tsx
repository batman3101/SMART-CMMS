import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Sparkles, Loader2, Trash2, Clock } from 'lucide-react'
import { aiApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const sampleQuestions = [
  '이번 주 가장 많이 고장난 설비는?',
  'CNC-001 설비의 최근 수리 이력 알려줘',
  'PM 일정이 다가오는 설비 목록',
  '평균 수리 시간이 가장 긴 수리 유형은?',
  '긴급수리 건수 추이 분석',
  '설비 가동률 현황',
]

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('ai.chat')}</h1>
        <Button variant="outline" size="sm" onClick={handleClearChat}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.clearChat')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Chat Area */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-[500px] space-y-4 overflow-y-auto p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-xs ${
                        message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Bot className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.generatingResponse')}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai.askQuestion')}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                {t('common.sampleQuestions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sampleQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto w-full justify-start px-4 py-3 text-left"
                    onClick={() => handleSampleQuestion(question)}
                    disabled={isLoading}
                  >
                    <span className="text-sm">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 사용 팁 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('common.usageTips')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
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
