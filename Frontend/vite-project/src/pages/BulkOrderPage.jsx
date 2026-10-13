import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipLoader } from 'react-spinners'
import {
  HiOutlineArrowLeft, HiOutlineBuildingStorefront, HiOutlineCalendarDays,
  HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineShoppingBag
} from 'react-icons/hi2'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'

/*
 * BulkOrderPage — a catering request built off a shop's existing menu.
 *
 * Prices shown here are the shop's live prices, and the backend re-prices every
 * line from the database on submit, so a stale tab can never place an order at
 * yesterday's price.
 */

const MINIMUM_ORDER = 500

function BulkOrderPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [shop, setShop] = useState(null)
  const [items, setItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [isForEvent, setIsForEvent] = useState(false)
  const [eventName, setEventName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    /* One call returns both the shop and its menu, which is why we don't need a
       separate shop-by-id endpoint. */
    axios.get(`${serverUrl}/api/item/getbyshop/${shopId}`, { withCredentials: true })
      .then(result => {
        if (!active) return
        setShop(result.data?.shop || null)
        setItems(result.data?.items || [])
      })
      .catch(caught => active && setError(caught?.response?.data?.message || t('bulk.loadError', 'Could not load this shop')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [shopId, t])

  const selected = useMemo(() => items
    .map(item => ({ item, quantity: Number(quantities[item._id]) || 0 }))
    .filter(entry => entry.quantity > 0), [items, quantities])

  const subtotal = useMemo(() => selected
    .reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0), [selected])

  const minimumMet = subtotal >= MINIMUM_ORDER
  const shortfall = Math.max(0, MINIMUM_ORDER - subtotal)

  const setQuantity = (itemId, raw) => {
    const value = Math.max(0, Math.floor(Number(raw) || 0))
    setQuantities(previous => ({ ...previous, [itemId]: value }))
  }

  const place = async event => {
    event.preventDefault()
    if (placing) return
    if (selected.length === 0) {
      setError(t('bulk.empty', 'Add a quantity for at least one item'))
      return
    }
    if (!deliveryAddress.trim()) {
      setError(t('bulk.addressRequired', 'A delivery address is required'))
      return
    }

    setPlacing(true)
    setError('')
    try {
      await axios.post(`${serverUrl}/api/bulk-orders`, {
        shopId,
        items: selected.map(entry => ({
          itemId: entry.item._id,
          name: entry.item.name,
          price: entry.item.price,
          quantity: entry.quantity,
          unit: 'pieces'
        })),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate: deliveryDate || null,
        note: note.trim(),
        isForEvent,
        eventName: isForEvent ? eventName.trim() : '',
        paymentMethod
      }, { withCredentials: true })
      navigate('/my-bulk-orders')
    } catch (caught) {
      setError(caught?.response?.data?.message || t('bulk.placeError', 'Could not place the bulk order'))
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-[1100px] px-4 pb-20 pt-6 sm:px-6'>
        <header className='flex items-center gap-3'>
          <button onClick={() => navigate(`/shop/${shopId}`)} className='btn-ghost !h-10 !w-10 !p-0'
            aria-label={t('common.back', 'Back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{t('bulk.eyebrow', 'Bulk & catering')}</p>
            <h1 className='t-title mt-0.5'>
              {shop ? t('bulk.title', { shop: shop.name, defaultValue: `Bulk order from ${shop.name}` })
                : t('bulk.titleFallback', 'Bulk order')}
            </h1>
            <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>
              {t('bulk.subtitle', 'For events, offices, or large gatherings')}
            </p>
          </div>
        </header>

        {loading && (
          <div className='grain card card-3d mt-6 flex flex-col items-center gap-3 p-12'>
            <div className='loading-dots'><span /><span /><span /></div>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('common.loading', 'Loading…')}</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className='grain card card-3d mt-6 p-12 text-center'>
            <span className='text-4xl' aria-hidden='true'>🥘</span>
            <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>
              {t('bulk.noItems', "This shop hasn't listed any items yet.")}
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <form className='mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]' onSubmit={place}>
            {/* ------------------------ the menu table ------------------------ */}
            <section className='grain card card-3d overflow-hidden'>
              <div className='hidden grid-cols-[2.2fr_1fr_1.1fr_1fr_1fr] gap-2 px-5 py-3 sm:grid' style={{ borderBottom: '1px solid var(--border)' }}>
                {['item', 'price', 'quantity', 'unit', 'total'].map(column => (
                  <span key={column} className='t-eyebrow'>{t(`bulk.columns.${column}`)}</span>
                ))}
              </div>

              <ul>
                {items.map(item => {
                  const quantity = Number(quantities[item._id]) || 0
                  const dim = quantity === 0
                  return (
                    <li key={item._id}
                      className='grid grid-cols-1 items-center gap-3 px-5 py-4 transition-opacity sm:grid-cols-[2.2fr_1fr_1.1fr_1fr_1fr] sm:gap-2'
                      style={{ borderBottom: '1px solid var(--border)', opacity: dim ? 0.55 : 1 }}>
                      <div className='flex min-w-0 items-center gap-3'>
                        <img src={item.image} alt='' className='h-11 w-11 shrink-0 rounded-xl object-cover' />
                        <span className='min-w-0 truncate text-sm font-bold' style={{ color: 'var(--ink)' }}>{item.name}</span>
                      </div>

                      <span className='text-sm' style={{ color: 'var(--ink-soft)' }}>₹{item.price}</span>

                      <label className='flex items-center gap-2'>
                        <span className='t-eyebrow sm:hidden'>{t('bulk.columns.quantity')}</span>
                        <input type='number' min='0' inputMode='numeric' className='w-20 px-2 py-1.5 text-sm'
                          aria-label={`${t('bulk.columns.quantity')} — ${item.name}`}
                          value={quantity || ''}
                          placeholder='0'
                          onChange={event => setQuantity(item._id, event.target.value)} />
                      </label>

                      <span className='text-sm' style={{ color: 'var(--ink-muted)' }}>
                        <span className='t-eyebrow sm:hidden'>{t('bulk.columns.unit')}: </span>
                        {t('bulk.units.pieces', 'pieces')}
                      </span>

                      <span className='text-sm font-bold' style={{ color: quantity > 0 ? 'var(--accent-2)' : 'var(--ink-faint)' }}>
                        ₹{Math.round(item.price * quantity * 100) / 100}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* --------------------------- the summary --------------------------- */}
            <aside className='grain card card-3d h-max p-5 sm:p-6'>
              <h2 className='t-title !text-lg flex items-center gap-2'>
                <HiOutlineShoppingBag style={{ color: 'var(--accent-2)' }} /> {t('bulk.summary', 'Order summary')}
              </h2>

              {selected.length === 0 ? (
                <p className='mt-4 text-sm' style={{ color: 'var(--ink-muted)' }}>
                  {t('bulk.nothingSelected', 'Set a quantity to start your request.')}
                </p>
              ) : (
                <ul className='mt-4 space-y-2'>
                  {selected.map(({ item, quantity }) => (
                    <li key={item._id} className='flex items-center justify-between gap-3 text-sm'>
                      <span className='min-w-0 truncate' style={{ color: 'var(--ink-soft)' }}>
                        {item.name} <span style={{ color: 'var(--ink-faint)' }}>× {quantity}</span>
                      </span>
                      <span className='shrink-0 font-bold' style={{ color: 'var(--ink)' }}>
                        ₹{Math.round(item.price * quantity * 100) / 100}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className='mt-4 flex items-center justify-between pt-3' style={{ borderTop: '1px solid var(--border)' }}>
                <span className='t-eyebrow'>{t('bulk.subtotal', 'Subtotal')}</span>
                <span className='font-display text-2xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
                  ₹{Math.round(subtotal * 100) / 100}
                </span>
              </div>

              <div className='mt-3 rounded-2xl px-4 py-3 text-xs font-bold'
                style={minimumMet
                  ? { background: 'var(--success-soft)', color: 'var(--success)' }
                  : { background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                <span className='flex items-center gap-1.5'>
                  {minimumMet ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
                  {minimumMet
                    ? t('bulk.minimumMet', { minimum: MINIMUM_ORDER, defaultValue: `Minimum order of ₹${MINIMUM_ORDER} met` })
                    : t('bulk.minimumNotice', { amount: shortfall, minimum: MINIMUM_ORDER, defaultValue: `Add ₹${shortfall} more to reach the ₹${MINIMUM_ORDER} minimum` })}
                </span>
              </div>

              <div className='mt-5 space-y-4'>
                <label className='block'>
                  <span className='t-eyebrow mb-1.5 flex items-center gap-1.5'>
                    <HiOutlineCalendarDays /> {t('bulk.deliveryDate', 'Delivery date')}
                  </span>
                  <input type='date' className='w-full px-3 py-2' value={deliveryDate}
                    onChange={event => setDeliveryDate(event.target.value)} />
                </label>

                <label className='block'>
                  <span className='t-eyebrow mb-1.5 block'>{t('bulk.deliveryAddress', 'Delivery address')}</span>
                  <textarea rows={3} className='w-full px-3 py-2' value={deliveryAddress}
                    placeholder={t('bulk.deliveryAddressPlaceholder', 'Where should this be delivered?')}
                    onChange={event => setDeliveryAddress(event.target.value)} />
                </label>

                <div>
                  <span className='t-eyebrow mb-1.5 block'>{t('bulk.isForEvent', 'Is this for an event?')}</span>
                  <div className='grid grid-cols-2 gap-2'>
                    {[true, false].map(option => (
                      <button key={String(option)} type='button' onClick={() => setIsForEvent(option)}
                        className='rounded-2xl px-3 py-2 text-sm font-bold transition-all'
                        style={isForEvent === option
                          ? { background: 'var(--accent-2)', color: 'var(--accent-ink)', border: '1px solid var(--accent-2)' }
                          : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}>
                        {option ? t('common.yes', 'Yes') : t('common.no', 'No')}
                      </button>
                    ))}
                  </div>
                </div>

                {isForEvent && (
                  <label className='block'>
                    <span className='t-eyebrow mb-1.5 block'>{t('bulk.eventName', 'Event name')}</span>
                    <input type='text' className='w-full px-3 py-2' value={eventName}
                      placeholder={t('bulk.eventNamePlaceholder', 'e.g. Sharma wedding')}
                      onChange={event => setEventName(event.target.value)} />
                  </label>
                )}

                <label className='block'>
                  <span className='t-eyebrow mb-1.5 block'>{t('bulk.note', 'Note to the restaurant')}</span>
                  <textarea rows={2} className='w-full px-3 py-2' value={note}
                    placeholder={t('bulk.notePlaceholder', 'Spice level, timing, packaging…')}
                    onChange={event => setNote(event.target.value)} />
                </label>

                <div>
                  <span className='t-eyebrow mb-1.5 block'>{t('bulk.paymentMethod', 'Payment method')}</span>
                  <div className='grid grid-cols-2 gap-2'>
                    {['cash', 'online'].map(option => (
                      <button key={option} type='button' onClick={() => setPaymentMethod(option)}
                        className='rounded-2xl px-3 py-2 text-sm font-bold transition-all'
                        style={paymentMethod === option
                          ? { background: 'var(--accent-2)', color: 'var(--accent-ink)', border: '1px solid var(--accent-2)' }
                          : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}>
                        {t(`bulk.${option}`, option === 'cash' ? 'Cash' : 'Online')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <p className='mt-4 text-sm' style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              <button type='submit' className='btn-primary mt-5 w-full' disabled={placing || selected.length === 0}>
                {placing
                  ? <><ClipLoader size={16} color='currentColor' /> <span className='ml-2'>{t('bulk.placing', 'Placing…')}</span></>
                  : <><HiOutlineBuildingStorefront /> <span className='ml-2'>{t('bulk.place', 'Place bulk order')}</span></>}
              </button>
              <p className='mt-3 text-center text-xs' style={{ color: 'var(--ink-faint)' }}>
                {t('bulk.reviewHint', 'The restaurant confirms your request before cooking starts.')}
              </p>
            </aside>
          </form>
        )}
      </main>
    </div>
  )
}

export default BulkOrderPage
