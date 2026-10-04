import { useEffect, useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'

/**
 * Loads the signed-in customer's meal schedule slots (for the "Your usual"
 * bento tile on the market board). Returns [] when unavailable.
 */
export default function useMySchedules() {
  const [slots, setSlots] = useState([])

  useEffect(() => {
    let active = true
    axios.get(`${serverUrl}/api/meal-schedule`, { withCredentials: true })
      .then(res => { if (active) setSlots(res.data?.slots || []) })
      .catch(() => { })
    return () => { active = false }
  }, [])

  return slots
}
