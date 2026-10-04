import React, { useEffect, useMemo, useState } from 'react'
import MarketNav from '../components/MarketNav.jsx'
import { dm } from '../api/dm'
import {
  HiOutlineBanknotes, HiOutlineClock, HiOutlineReceiptPercent, HiOutlineChartBar
} from 'react-icons/hi2'

/*
 * Farmer earnings ledger: mirrors the delivery-partner bento. Settled = delivered
 * & paid; pending = everything in flight. Includes a "report last sold price"
 * call-to-action that feeds the community price board.
 * Dark + light: tokens. Mobile: tiles stack 2-up then 1-up.
 */
function FarmerEarningsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState({ crop: '', district: '', pricePerUnit: '' })
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    dm.get('/farmer/earnings').then(res => setData(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => (data?.orders || []).map(o => ({
    id: o._id,
    label: o.items?.map(i => `${i.name} ×${i.quantity}`).join(', ') || 'Order',
    amount: o.totalAmount || 0,
    status: o.status,
    method: o.paymentMethod,
    paid: o.payment,
    ref: o.razorpayOrderId || o._id,
    at: o.createdAt
  })), [data])

  const submitReport = async (e) => {
    e.preventDefault()
    try {
      await dm.post('/prices/report', { crop: report.crop, district: report.district, pricePerUnit: Number(report.pricePerUnit) })
      setReport({ crop: '', district: '', pricePerUnit: '' })
      showToast('Thanks — your price feeds the district board')
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not report price', 'error')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-4xl px-4 py-10'><div className='skeleton h-10 w-64' /></main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      {toast && (
        <div className='toast rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}
      <main className='mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Earnings ledger</p>
          <h1 className='t-display mt-2'>What the market paid you</h1>
        </header>

        <div className='stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--rescue-soft)' }}>
            <p className='t-eyebrow'>Settled</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--rescue)' }}>
              ₹{data?.settledAmount || 0}
            </p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--warning-soft)' }}>
            <p className='t-eyebrow'>Pending settlement</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
              ₹{data?.pendingAmount || 0}
            </p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--accent-2-soft)' }}>
            <p className='t-eyebrow'>Lifetime</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
              ₹{data?.totalEarnings || 0}
            </p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--plan-soft)' }}>
            <p className='t-eyebrow'>Orders</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--plan)' }}>
              {rows.length}
            </p>
          </div>
        </div>

        <div className='stagger mt-6 space-y-2'>
          {rows.length === 0 && (
            <div className='grain card p-10 text-center'>
              <span className='text-4xl' aria-hidden='true'>🪙</span>
              <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>No transactions yet. Your first sale will land here.</p>
            </div>
          )}
          {rows.map(row => (
            <div key={row.id} className='grain card flex flex-wrap items-center justify-between gap-3 p-4'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-bold'>{row.label}</p>
                <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                  <HiOutlineReceiptPercent className='mr-1 inline' size={12} />
                  {row.method === 'online' ? 'Razorpay' : 'COD'} · {new Date(row.at).toLocaleDateString()} · ref {String(row.ref).slice(-8)}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className={`badge ${row.status === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>
                <span className='font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{row.amount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* community price board contribution */}
        <section className='grain card mt-8 p-5'>
          <h2 className='t-title flex items-center gap-2'><HiOutlineChartBar style={{ color: 'var(--rescue)' }} /> Feed the price board</h2>
          <p className='mt-1 text-sm' style={{ color: 'var(--ink-muted)' }}>
            Sold something recently? Publish the price you got (per kg) — it powers fair-price bands for every farmer in your district.
          </p>
          <form className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]' onSubmit={submitReport}>
            <input className='px-3 py-2 text-sm' placeholder='Crop (e.g. Tomato)' value={report.crop} onChange={e => setReport(r => ({ ...r, crop: e.target.value }))} aria-label='Crop' />
            <input className='px-3 py-2 text-sm' placeholder='District' value={report.district} onChange={e => setReport(r => ({ ...r, district: e.target.value }))} aria-label='District' />
            <input className='px-3 py-2 text-sm' placeholder='Price ₹/kg' inputMode='decimal' value={report.pricePerUnit} onChange={e => setReport(r => ({ ...r, pricePerUnit: e.target.value }))} aria-label='Price per kg' />
            <button className='btn-primary !px-5 !py-2 text-sm'>Publish</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default FarmerEarningsPage
