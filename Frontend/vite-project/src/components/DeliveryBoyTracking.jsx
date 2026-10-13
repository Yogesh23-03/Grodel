import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import scooter from '../assets/scooter.webp'
import home from '../assets/home.png'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'

const deliveryBoyIcon = new L.Icon({
  iconUrl: scooter,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
})
const customerIcon = new L.Icon({
  iconUrl: home,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
})

/* A usable coordinate is a finite, non-zero number. (0, 0) is the "unset"
   marker used across the app, and Leaflet throws "Invalid LatLng object" on
   null/undefined — which would blank the whole order-tracking page. */
const isCoord = (value) => Number.isFinite(Number(value)) && Number(value) !== 0

/* Keeps the view framed on both the rider and the customer as the rider moves */
function AutoFit({ points }) {
  const map = useMap()
  useEffect(() => {
    const valid = (points || []).filter(Boolean)
    if (valid.length >= 2) {
      map.fitBounds(L.latLngBounds(valid).pad(0.35))
    } else if (valid.length === 1) {
      map.setView(valid[0], 15)
    }
  }, [map, points[0], points[1]])
  return null
}

function DeliveryBoyTracking({ data }) {
  const { t } = useTranslation()

  const riderReady = isCoord(data?.deliveryBoyLocation?.lat) && isCoord(data?.deliveryBoyLocation?.lon)
  const customerReady = isCoord(data?.customerLocation?.lat) && isCoord(data?.customerLocation?.lon)

  if (!riderReady && !customerReady) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4 text-center text-sm' style={{ color: 'var(--ink-muted)' }}>
        <p>{t('track.mapWaiting', 'The live map appears once the rider shares their location.')}</p>
      </div>
    )
  }

  const points = []
  if (riderReady) points.push([data.deliveryBoyLocation.lat, data.deliveryBoyLocation.lon])
  if (customerReady) points.push([data.customerLocation.lat, data.customerLocation.lon])

  return (
    <div className='h-full w-full'>
      <MapContainer center={points[0]} zoom={15} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <AutoFit points={points} />
        {riderReady && (
          <Marker position={[data.deliveryBoyLocation.lat, data.deliveryBoyLocation.lon]} icon={deliveryBoyIcon}>
            <Popup>{t('track.yourRider', 'Your rider')}</Popup>
          </Marker>
        )}
        {customerReady && (
          <Marker position={[data.customerLocation.lat, data.customerLocation.lon]} icon={customerIcon}>
            <Popup>{t('track.destination', 'Delivery destination')}</Popup>
          </Marker>
        )}
        {points.length >= 2 && (
          <Polyline positions={points} pathOptions={{ color: 'var(--accent-2)', weight: 4, dashArray: '8 10', opacity: 0.9 }} />
        )}
      </MapContainer>
    </div>
  )
}

export default DeliveryBoyTracking
