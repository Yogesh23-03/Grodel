import React, { useEffect, useState } from 'react'
import { HiOutlineChartBar, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2'
import { dm } from '../api/dm'

/*
 * Price intelligence chip (guidance, not a mandate).
 * - crop (required), district (optional), price (optional: shows "vs median")
 * - Renders nothing meaningful when the community board has no data yet.
 * Dark + light: reads --rescue/--surface tokens. Mobile: full-width chip.
 */
function PriceBandChip({ crop, district, price, onBand }) {
  const [band, setBand] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | empty

  useEffect(() => {
    let active = true
    if (!crop) return
    setState('loading')
    const params = new URLSearchParams({ crop })
    if (district) params.set('district', district)
    dm.get(`/prices/band?${params.toString()}`)
      .then(res => {
        if (!active) return
        setBand(res.data?.band || null)
        setState(res.data?.band ? 'ready' : 'empty')
        if (res.data?.band && onBand) onBand(res.data.band)
      })
      .catch(() => active && setState('empty'))
    return () => { active = false }
  }, [crop, district])

  if (state !== 'ready' || !band) return null
  const vsMedian = price !== undefined && band.median ? price - band.median : null

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold'
      style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
      <HiOutlineChartBar size={14} />
      <span>
        {band.district} band ₹{band.low}–₹{band.high} · median ₹{band.median}
        <span className='ml-1 font-normal opacity-70'>({band.sampleCount} reports)</span>
      </span>
      {vsMedian !== null && vsMedian !== 0 && (
        <span className='inline-flex items-center gap-1'>
          {vsMedian > 0
            ? <><HiOutlineArrowTrendingUp size={13} /> ₹{Math.abs(vsMedian)} above</>
            : <><HiOutlineArrowTrendingDown size={13} /> ₹{Math.abs(vsMedian)} below</>}
        </span>
      )}
    </div>
  )
}

export default PriceBandChip
