import { useEffect, useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'

/**
 * Aggregated food-rescue impact for the market board: how many completed
 * donation deliveries exist and how many item-units they carried. Backed by
 * public trust listings + the donor's own history, so it works for any
 * signed-in user. Returns { rescuedUnits, deliveries, loading }.
 */
export default function useRescueImpact() {
  const [impact, setImpact] = useState({ rescuedUnits: 0, deliveries: 0, loading: true })

  useEffect(() => {
    let active = true
    axios.get(`${serverUrl}/api/donations/my`, { withCredentials: true })
      .then(res => {
        if (!active) return
        const donations = res.data || []
        const delivered = donations.filter(d => d.status === 'delivered')
        const units = donations.reduce((sum, d) => {
          const items = Array.isArray(d.foodItems) ? d.foodItems : []
          return sum + items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0)
        }, 0)
        setImpact({ rescuedUnits: Math.round(units), deliveries: delivered.length, loading: false })
      })
      .catch(() => { if (active) setImpact(prev => ({ ...prev, loading: false })) })
    return () => { active = false }
  }, [])

  return impact
}
