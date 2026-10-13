import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketNav from '../components/MarketNav.jsx'
import PriceBandChip from '../components/PriceBandChip.jsx'
import { dm } from '../api/dm'
import { HiOutlinePaperAirplane, HiOutlineWrenchScrewdriver } from 'react-icons/hi2'

/*
 * Farmer assistant — rule-based, honest about what it is. It answers four kinds
 * of questions from GroDel's own data: how to list, what price to set (district
 * band), how to dispatch, and where earnings stand. No external LLM call.
 * Dark + light: tokens. Mobile: full-width chat column.
 */
const SUGGESTIONS = [
  'How do I list a new crop?',
  'What price should I set for tomato?',
  'How does dispatch work?',
  'Where are my earnings?'
]

function FarmerAssistantPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Namaste! Ask me about listing produce, setting prices, dispatching orders, or your earnings. I answer from GroDel\'s own guidance — not a fortune teller.' }
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  const answer = async (question) => {
    const q = question.toLowerCase()
    if (q.includes('list')) {
      return 'Tap "List produce" on your dashboard. Add a clear photo — GroDel suggests the crop name, category and grade automatically. Set your quantity, your price (check the green band for the district median), and mark it fresh if harvested today.'
    }
    if (q.includes('price') || q.includes('rate')) {
      const crop = question.split('for ')[1]?.replace('?', '').trim() || 'tomato'
      try {
        const res = await dm.get(`/prices/band?crop=${encodeURIComponent(crop)}`)
        const band = res.data?.band
        if (band) return `The ${band.district} community board shows ${band.crop} between ₹${band.low} and ₹${band.high}, median ₹${band.median} (${band.sampleCount} reports). Grade A can ask the top of the band; early harvest can ask a premium. This is guidance — you decide.`
        return `No reports for ${crop} yet. Be the first: after you sell, publish your price from the Earnings page so your neighbours get a fair band too.`
      } catch {
        return 'I could not reach the price board just now. As a rule: cover your cost, check the mandi, and ask slightly above your floor — negotiation exists.'
      }
    }
    if (q.includes('dispatch') || q.includes('deliver') || q.includes('pickup')) {
      return 'When an order arrives you Accept it, then mark it Ready when packed. For pickups, the buyer (or their person) collects from your farm — schedule a time on the order card. For deliveries, mark it "Out of delivery" and a GroDel partner handles the run; the buyer tracks it live.'
    }
    if (q.includes('earning') || q.includes('payment') || q.includes('money')) {
      return 'Open the Earnings ledger from your dashboard: Settled shows delivered-and-paid orders, Pending shows orders in flight. Online payments settle via Razorpay to your account; COD amounts are collected on handover. Report your last sold price there to help the district board.'
    }
    if (q.includes('coop') || q.includes('bulk')) {
      return 'When a retailer orders more than one farm can supply, GroDel proposes a cooperative order: nearby farmers each get a share with their payout and a dispatch deadline. You accept or decline independently — accept only what you can honestly supply.'
    }
    return 'I can help with: listing produce, setting a fair price (I will fetch your district band), dispatch and pickups, cooperative bulk orders, and your earnings ledger. Ask one of those.'
  }

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    const reply = await answer(question)
    setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Farmhand helper</p>
          <h1 className='t-display mt-2'>Ask before you act</h1>
        </header>

        <div className='grain card mt-6 flex max-h-[62vh] min-h-[380px] flex-col card-3d'>
          <div className='flex-1 space-y-3 overflow-y-auto p-5'>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className='max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed'
                  style={m.role === 'user'
                    ? { background: 'var(--vendor)', color: '#1c1006' }
                    : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className='px-5 pb-4'>
            <div className='mb-2 flex flex-wrap gap-1.5'>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className='rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 stagger-item'
                  style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
                  {s}
                </button>
              ))}
            </div>
            <form className='flex gap-2' onSubmit={e => { e.preventDefault(); send() }}>
              <input className='flex-1 px-3 py-2 text-sm' placeholder='Ask the farmhand…' value={input} onChange={e => setInput(e.target.value)} aria-label='Question' />
              <button type='submit' className='btn-primary !px-4 !py-2' aria-label='Send'><HiOutlinePaperAirplane /></button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FarmerAssistantPage
