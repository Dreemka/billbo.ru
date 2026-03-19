import { useEffect, useRef } from 'react'
import { Card } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Billboard } from '../../entities/types'

interface LeafletMapProps {
  items: Billboard[]
}

export function LeafletMap({ items }: LeafletMapProps) {
  const mapHostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapHostRef.current).setView([55.751244, 37.618423], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) {
      return
    }

    layerRef.current.clearLayers()
    const bounds = L.latLngBounds([])
    items.forEach((item) => {
      const marker = L.marker([item.lat, item.lng]).bindPopup(
        `<strong>${item.title}</strong><br/>${item.address}<br/>${item.pricePerWeek.toLocaleString('ru-RU')} RUB / неделя`,
      )
      marker.addTo(layerRef.current as L.LayerGroup)
      bounds.extend([item.lat, item.lng])
    })

    if (items.length > 0) {
      mapRef.current.fitBounds(bounds.pad(0.2))
    }
  }, [items])

  return (
    <Card>
      <div className="leaflet-map" ref={mapHostRef} />
    </Card>
  )
}
