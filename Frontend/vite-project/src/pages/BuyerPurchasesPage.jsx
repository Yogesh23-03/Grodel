import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketNav from '../components/MarketNav.jsx'
import { dm } from '../api/dm'
import { HiOutlineDocumentArrowDown, HiOutlineReceiptPercent } from 'react-icons/hi2'

/*
 * Buyer purchase history for direct produce buys. Status chips mirror the vendor
 * order flow; invoices show a download affordance once the farmer issues one.
 * Dark + light: tokens. Mobile: stacked rows.
 */
const STATUS_STYLES = {
  pending: 'badge-warning',
  confirmed: 'badge-brand',
  ready: 'badge-accent',
  'out of delivery': 'badge-accent',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
}

function BuyerPurchasesPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dm.get('/buyer/purchases').then(res => setOrders(res.data?.orders || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-3xl px-4 py-10'><div className='skeleton h-10 w-64' /></main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Direct buys</p>
          <h1 className='t-display mt-2'>Your purchases from farmers</h1>
        </header>

        <div className='stagger mt-6 space-y-3'>
          {orders.length === 0 && (
            <div className='grain card p-10 text-center card-3d'>
              <span className='text-4xl' aria-hidden='true'>🧺</span>
              <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>Nothing yet. Find farmers who match your kitchen.</p>
              <button className='btn-primary mt-4' onClick={() => navigate('/buyer/matches')}>Browse matches</button>
            </div>
          )}
          {orders.map(order => (
            <article key={order._id} className='grain card p-4 card-3d'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-sm font-bold'>
                    {order.items?.map(i => `${i.name} ×${i.quantity}${i.unit ? ` ${i.unit}` : ''}`).join(', ')}
                  </p>
                  <p className='mt-0.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod === 'online' ? 'Paid online' : 'COD'} · {order.fulfillmentType === 'pickup' ? 'Farm pickup' : 'Delivery'}
                  </p>
                  {order.invoiceNumber && (
                    <p className='mt-1 flex items-center gap-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                      <HiOutlineReceiptPercent size={12} /> Invoice {order.invoiceNumber}
                      {order.invoicePdfUrl
                        ? <a className='link-brand ml-1' href={order.invoicePdfUrl} target='_blank' rel='noreferrer'><HiOutlineDocumentArrowDown className='inline' size={13} /> PDF</a>
                        : <span className='ml-1'>(PDF pending)</span>}
                    </p>
                  )}
                </div>
                <div className='text-right'>
                  <span className={`badge ${STATUS_STYLES[order.status] || 'badge-muted'}`}>{order.status}</span>
                  <p className='mt-1 font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{order.totalAmount}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

export default BuyerPurchasesPage
