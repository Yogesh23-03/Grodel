import React, { useEffect, useRef, useState } from 'react'
import { TbCurrentLocation } from "react-icons/tb";
import { IoSearchOutline, IoLocationSharp } from "react-icons/io5";
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import "leaflet/dist/leaflet.css"
import { setAddress, setLocation } from '../redux/mapSlice';
import { MdDeliveryDining } from "react-icons/md";
import { FaCreditCard } from "react-icons/fa";
import axios from 'axios';
import { FaMobileScreenButton } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { addMyOrder, clearCart } from '../redux/userSlice';
import { useTranslation } from 'react-i18next';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import MarketNav from '../components/MarketNav.jsx';

function RecenterMap({ location }) {
  // useMap() MUST be called unconditionally: calling it inside the `if`
  // changed the hook count between renders and crashed the page with
  // "Rendered more hooks than during the previous render" as soon as a
  // location was picked. The recentre itself belongs in an effect.
  const map = useMap()
  useEffect(() => {
    if (location?.lat && location?.lon) {
      map.setView([location.lat, location.lon], 16, { animate: true })
    }
  }, [map, location?.lat, location?.lon])
  return null
}

function CheckOut() {
  const { t } = useTranslation()
  const { location, address } = useSelector(state => state.map)
  const { cartItems, totalAmount, userData } = useSelector(state => state.user)
  const [addressInput, setAddressInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [placing, setPlacing] = useState(false)
  /* A ref, not the `placing` state: the state value captured in this closure
     is still false for a click that lands before React re-renders and disables
     the button, which is how a fast double tap created two identical orders. */
  const placingRef = useRef(false)
  const [checkoutError, setCheckoutError] = useState("")
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const apiKey = import.meta.env.VITE_GEOAPIKEY
  const deliveryFee = totalAmount > 500 ? 0 : 40
  const AmountWithDeliveryFee = totalAmount + deliveryFee

  /* The map slice starts at { lat: null, lon: null }, and Leaflet throws
     "Invalid LatLng object" if it is handed null — which unmounted this whole
     page for every customer who had not picked a location yet. Fall back to the
     customer's saved coordinates, then to a city centre, and only place the
     draggable pin once a real position exists. */
  const savedCoords = userData?.location?.coordinates
  const fallbackCenter = (Array.isArray(savedCoords) && Number.isFinite(savedCoords[0]) && Number.isFinite(savedCoords[1]) && (savedCoords[0] !== 0 || savedCoords[1] !== 0))
    ? [savedCoords[1], savedCoords[0]]
    : [12.9716, 77.5946]
  /* New accounts are stored with coordinates [0, 0] until a location is ever
     captured, so 0/0 has to count as "not set" here — otherwise the pin lands
     in the Atlantic and the order is rejected for having no real location. */
  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lon) && (location.lat !== 0 || location.lon !== 0)
  const mapCenter = hasLocation ? [location.lat, location.lon] : fallbackCenter

  const onDragEnd = (e) => {
    const { lat, lng } = e.target._latlng
    dispatch(setLocation({ lat, lon: lng }))
    getAddressByLatLng(lat, lng)
  }
  const getCurrentLocation = () => {
    const latitude = userData.location.coordinates[1]
    const longitude = userData.location.coordinates[0]
    dispatch(setLocation({ lat: latitude, lon: longitude }))
    getAddressByLatLng(latitude, longitude)
  }

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`)
      dispatch(setAddress(result?.data?.results[0].address_line2))
    } catch (error) {
      console.log(error)
    }
  }

  /* Returns the resolved coordinates (or null) so the checkout can finish the
     order right after geocoding, instead of posting an empty location and
     getting a 400 back. */
  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`)
      const found = result.data?.features?.[0]?.properties
      if (!found) return null
      const { lat, lon } = found
      dispatch(setLocation({ lat, lon }))
      return { lat, lon }
    } catch (error) {
      console.log(error)
      return null
    }
  }

  const handlePlaceOrder = async () => {
    if (placingRef.current) return
    placingRef.current = true

    if (!cartItems?.length) {
      placingRef.current = false
      setCheckoutError(t('checkout.emptyBasket', 'Your basket is empty'))
      return
    }
    if (!addressInput.trim()) {
      placingRef.current = false
      setCheckoutError(t('checkout.needAddress', 'Add a delivery address'))
      return
    }

    setPlacing(true)
    setCheckoutError('')

    /* No pin yet? Try the address the customer typed before giving up — this
       used to be a silent 400 with nothing on screen at all. */
    let coords = hasLocation ? { lat: location.lat, lon: location.lon } : null
    if (!coords) coords = await getLatLngByAddress()
    if (!coords) {
      placingRef.current = false
      setPlacing(false)
      setCheckoutError(t('checkout.needLocation', 'Search your address or drop the pin on the map so we know where to deliver'))
      return
    }

    /* Flips only once the server has accepted the order, so the guard stays
       armed through a retry instead of letting a second request through. */
    let accepted = false

    try {
      const result = await axios.post(`${serverUrl}/api/order/place-order`, {
        paymentMethod,
        deliveryAddress: {
          text: addressInput,
          latitude: coords.lat,
          longitude: coords.lon
        },
        totalAmount: AmountWithDeliveryFee,
        cartItems
      }, { withCredentials: true })

      if (paymentMethod == "cod") {
        accepted = true
        /* The basket must not outlive an accepted order — leaving it full is
           what allowed the same order to be placed a second time. */
        dispatch(clearCart())
        dispatch(addMyOrder(result.data))
        navigate("/order-placed")
      } else {
        accepted = true
        const orderId = result.data.orderId
        const razorOrder = result.data.razorOrder
        openRazorpayWindow(orderId, razorOrder)
      }
    } catch (error) {
      console.log(error)
      setCheckoutError(error?.response?.data?.message || t('checkout.placeFailed', 'Could not place the order. Please try again.'))
    } finally {
      if (!accepted) placingRef.current = false
      setPlacing(false)
    }
  }

  const openRazorpayWindow = (orderId, razorOrder) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: razorOrder.amount,
      currency: 'INR',
      name: "Vingo",
      description: "Food Delivery Website",
      order_id: razorOrder.id,
      handler: async function (response) {
        try {
          const result = await axios.post(`${serverUrl}/api/order/verify-payment`, {
            razorpay_payment_id: response.razorpay_payment_id,
            orderId
          }, { withCredentials: true })
          dispatch(clearCart())
          dispatch(addMyOrder(result.data))
          navigate("/order-placed")
        } catch (error) {
          console.log(error)
        }
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  useEffect(() => {
    setAddressInput(address)
  }, [address])

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-[900px] px-4 pb-20 pt-6 sm:px-6'>
        <header className='flex items-center gap-3'>
          <button onClick={() => navigate("/")} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back', 'Back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow'>{t('checkout.eyebrow', 'Almost there')}</p>
            <h1 className='t-title mt-0.5'>{t('checkout.checkout')}</h1>
          </div>
        </header>

        <div className='grain card card-3d mt-6 space-y-7 p-5 sm:p-6'>
          <section>
            <h2 className='t-title flex items-center gap-2'><IoLocationSharp style={{ color: 'var(--accent-2)' }} /> {t('checkout.deliveryLocation', 'Delivery location')}</h2>
            <div className='mt-3 flex gap-2'>
              <input type="text" className='w-full min-w-0 flex-1 px-3 py-2 text-sm' placeholder={t('checkout.addressPlaceholder', 'Enter your delivery address…')} value={addressInput} onChange={(e) => setAddressInput(e.target.value)} />
              <button className='btn-ghost !px-3.5 !py-2' onClick={getLatLngByAddress} aria-label={t('checkout.searchAddress', 'Search address')}><IoSearchOutline size={17} /></button>
              <button className='btn-ghost !px-3.5 !py-2' onClick={getCurrentLocation} aria-label={t('checkout.useCurrent', 'Use current location')}><TbCurrentLocation size={17} /></button>
            </div>
            <div className='mt-3 overflow-hidden rounded-2xl' style={{ border: '1px solid var(--border)' }}>
              <div className='h-64 w-full'>
                <MapContainer
                  className={"w-full h-full"}
                  center={mapCenter}
                  zoom={16}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap location={location} />
                  {hasLocation && (
                    <Marker position={[location.lat, location.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
                  )}
                </MapContainer>
              </div>
            </div>
          </section>

          <section>
            <h2 className='t-title'>{t('checkout.paymentMethod', 'Payment method')}</h2>
            <div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-left transition-all ${paymentMethod === "cod" ? "" : ""}`}
                style={paymentMethod === "cod"
                  ? { border: '1px solid var(--accent)', background: 'var(--accent-soft)', boxShadow: 'var(--shadow-lime)' }
                  : { border: '1px solid var(--border-strong)', background: 'var(--surface-2)' }}
                onClick={() => setPaymentMethod("cod")} role="radio" aria-checked={paymentMethod === "cod"}>
                <span className='mode-rescue inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <MdDeliveryDining className='text-xl' />
                </span>
                <div>
                  <p className='font-bold'>{t('checkout.cod', 'Cash on delivery')}</p>
                  <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>{t('checkout.codHint', 'Pay when your food arrives')}</p>
                </div>
              </div>
              <div className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-left transition-all`}
                style={paymentMethod === "online"
                  ? { border: '1px solid var(--accent)', background: 'var(--accent-soft)', boxShadow: 'var(--shadow-lime)' }
                  : { border: '1px solid var(--border-strong)', background: 'var(--surface-2)' }}
                onClick={() => setPaymentMethod("online")} role="radio" aria-checked={paymentMethod === "online"}>
                <span className='mode-plan inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <FaMobileScreenButton className='text-lg' />
                </span>
                <span className='mode-eat inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <FaCreditCard className='text-lg' />
                </span>
                <div>
                  <p className='font-bold'>{t('checkout.upi', 'UPI / card')}</p>
                  <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>{t('checkout.upiHint', 'Pay securely online')}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className='t-title'>{t('checkout.summary', 'Order summary')}</h2>
            <div className='mt-3 space-y-2 rounded-2xl p-4' style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {cartItems.map((item, index) => (
                <div key={index} className='flex justify-between text-sm stagger-item' style={{ color: 'var(--ink-soft)' }}>
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <hr style={{ borderColor: 'var(--border)' }} />
              <div className='flex justify-between font-semibold'>
                <span>{t('cart.subtotal')}</span>
                <span>₹{totalAmount}</span>
              </div>
              <div className='flex justify-between text-sm' style={{ color: 'var(--ink-muted)' }}>
                <span>{t('cart.deliveryFee')}</span>
                <span>{deliveryFee == 0 ? t('checkout.free', 'Free') : `₹${deliveryFee}`}</span>
              </div>
              <div className='flex justify-between pt-1 font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                <span>{t('cart.total')}</span>
                <span>₹{AmountWithDeliveryFee}</span>
              </div>
            </div>
          </section>

          {checkoutError && (
            <p className='rounded-2xl px-4 py-3 text-sm font-semibold' role='alert'
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {checkoutError}
            </p>
          )}

          <button className='btn-primary w-full' onClick={handlePlaceOrder} disabled={placing || !cartItems?.length}>
            {placing
              ? t('checkout.placing', 'Placing your order…')
              : paymentMethod == "cod" ? t('checkout.placeOrder') : t('checkout.payOnline')}
          </button>
        </div>
      </main>
    </div>
  )
}

export default CheckOut
