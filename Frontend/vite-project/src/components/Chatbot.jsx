import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  HiOutlineChatBubbleLeftRight, HiOutlineXMark, HiOutlinePaperAirplane,
  HiOutlineMicrophone, HiMicrophone
} from 'react-icons/hi2'
import { serverUrl } from '../App'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

/*
 * Chatbot — GroDel's floating food assistant.
 * Answers come from /api/chatbot, which feeds the live city menu into Groq
 * so the assistant can only recommend what is actually orderable right now.
 */
function Chatbot() {
  const { t, i18n } = useTranslation()
  const { currentCity } = useSelector(state => state.user)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef = useRef(null)

  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition(i18n.language)

  /* Greeting sits in the thread from the first open (localised, never typed twice). */
  useEffect(() => {
    setMessages(prev => (prev.length ? prev : [{ role: 'assistant', content: t('chatbot.greeting') }]))
  }, [t])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading, isOpen])

  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const suggestionKeys = ['popular', 'budget', 'spicy', 'veg', 'noOnion']

  const sendMessage = async (text) => {
    const message = String(text || '').trim()
    if (!message || loading) return

    setMessages(prev => [...prev, { role: 'user', content: message }])
    setInput('')
    setLoading(true)

    try {
      const result = await axios.post(
        `${serverUrl}/api/chatbot`,
        { message, conversationHistory: history, city: currentCity || '', language: i18n.language || 'en' },
        { withCredentials: true }
      )
      const reply = result.data?.reply || t('chatbot.error')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setHistory(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: reply }].slice(-10))
      if (!isOpen) setUnreadCount(count => count + 1)
    } catch (error) {
      console.log(error)
      setMessages(prev => [...prev, { role: 'assistant', content: t('chatbot.error') }])
    } finally {
      setLoading(false)
    }
  }

  /* Voice → send: the transcript is spoken input, so fire it as a message. */
  useEffect(() => {
    if (transcript && isOpen) {
      sendMessage(transcript)
      resetTranscript()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isOpen])

  const toggleVoice = () => {
    if (isListening) stopListening()
    else startListening()
  }

  return (
    <>
      {/* ---- floating launcher ---- */}
      <button
        onClick={() => setIsOpen(value => !value)}
        aria-label={t('chatbot.title')}
        title={t('chatbot.title')}
        /* `.chat-launcher` (index.css) supplies the bottom offset: 1.5rem
           normally, lifted clear of the mobile dock below 1024px, where this
           button would otherwise cover the dock's profile item. */
        className='chat-launcher fixed right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95'
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}
      >
        {isOpen ? <HiOutlineXMark size={24} /> : <HiOutlineChatBubbleLeftRight size={24} />}
        {!isOpen && unreadCount > 0 && (
          <span className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white'>
            {unreadCount}
          </span>
        )}
      </button>

      {/* ---- chat panel ---- */}
      {isOpen && (
        <div
          /* Full screen on phones, floating panel from `sm` up — the old fixed
             360px panel left a cramped column on small screens. */
          className='chat-panel grain inset-0 z-[9999] flex h-full w-full flex-col overflow-hidden border shadow-2xl sm:inset-auto sm:right-6 sm:h-[520px] sm:w-[360px] sm:rounded-3xl'
          /* inline, not the `fixed` utility: .grain is unlayered CSS and sets
             position: relative, which outranks Tailwind's layered utilities. */
          style={{ position: 'fixed', background: 'var(--surface-1)', borderColor: 'var(--border)' }}
        >
          {/* header */}
          <div className='flex items-center gap-3 border-b px-4 py-3' style={{ borderColor: 'var(--border)' }}>
            <span className='flex h-9 w-9 items-center justify-center rounded-full text-base font-black'
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', fontFamily: 'var(--font-display)' }}>
              G
            </span>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-bold'>{t('chatbot.title')}</p>
              <p className='flex items-center gap-1.5 text-[11px]' style={{ color: 'var(--ink-muted)' }}>
                <span className='h-1.5 w-1.5 rounded-full' style={{ background: 'var(--success)' }} />
                {t('chatbot.online')}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className='btn-ghost !h-9 !w-9 !p-0' aria-label={t('common.close')}>
              <HiOutlineXMark size={18} />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className='flex-1 space-y-3 overflow-y-auto px-4 py-4'>
            {messages.map((message, index) => (
              <div key={index} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className='max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed'
                  style={message.role === 'user'
                    ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                    : { background: 'var(--surface-3)', color: 'var(--ink)' }}
                >
                  {message.content}
                </div>
                <span className='mt-1 px-1 text-[10px]' style={{ color: 'var(--ink-faint)' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {loading && (
              <div className='flex flex-col items-start'>
                <div className='rounded-2xl px-3.5 py-2.5' style={{ background: 'var(--surface-3)' }}>
                  <div className='loading-dots'><span /><span /><span /></div>
                </div>
                <span className='mt-1 px-1 text-[10px]' style={{ color: 'var(--ink-faint)' }}>{t('chatbot.loading')}</span>
              </div>
            )}

            {/* quick suggestions while the thread is still fresh */}
            {messages.length <= 1 && (
              <div className='flex flex-wrap gap-2 pt-2'>
                {suggestionKeys.map(key => (
                  <button
                    key={key}
                    onClick={() => sendMessage(t(`chatbot.suggestions.${key}`))}
                    className='rounded-full border px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95'
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-soft)' }}
                  >
                    {t(`chatbot.suggestions.${key}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* input */}
          <div className='flex items-center gap-2 border-t px-3 py-3' style={{ borderColor: 'var(--border)' }}>
            <input
              type='text'
              value={isListening ? t('chatbot.listening') : input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') sendMessage(input) }}
              placeholder={t('chatbot.placeholder')}
              className='min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none'
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            />
            <button
              onClick={toggleVoice}
              aria-label={t('chatbot.voiceInput')}
              title={t('chatbot.voiceInput')}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${isListening ? 'animate-pulse' : ''}`}
              style={isListening
                ? { background: 'var(--danger)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--ink-muted)' }}
            >
              {isListening ? <HiMicrophone size={18} /> : <HiOutlineMicrophone size={18} />}
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label={t('chatbot.send')}
              title={t('chatbot.send')}
              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform disabled:opacity-40 active:scale-95'
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              <HiOutlinePaperAirplane size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
