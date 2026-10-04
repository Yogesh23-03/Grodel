import React, { useEffect } from 'react'
import scooter from '../assets/scooter.webp'
import home from '../assets/home.png'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'

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
  const deliveryBoyLat = data.deliveryBoyLocation.lat
  const deliveryBoyLon = data.deliveryBoyLocation.lon
  const customerLat = data.customerLocation.lat
  const customerLon = data.customerLocation.lon

  const path = [
    [deliveryBoyLat, deliveryBoyLon],
    [customerLat, customerLon]
  ]

  return (
    <div className='h-full w-full'>
      <MapContainer center={path[0]} zoom={15} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <AutoFit points={path} />
        <Marker position={path[0]} icon={deliveryBoyIcon}>
          <Popup>Your rider</Popup>
        </Marker>
        <Marker position={path[1]} icon={customerIcon}>
          <Popup>Delivery destination</Popup>
        </Marker>
        <Polyline positions={path} pathOptions={{ color: 'var(--accent-2)', weight: 4, dashArray: '8 10', opacity: 0.9 }} />
      </MapContainer>
    </div>
  )
}

export default DeliveryBoyTracking
