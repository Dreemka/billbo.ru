/// <reference types="vite/client" />

declare global {
  type YandexMapInstance = {
    geoObjects: {
      add: (obj: unknown) => void
      remove: (obj: unknown) => void
    }
    setCenter: (coords: [number, number], zoom: number) => void
    setBounds: (bounds: unknown, opts?: Record<string, unknown>) => void
    events: {
      add: (type: string, handler: (e: unknown) => void) => void
      remove: (type: string, handler: (e: unknown) => void) => void
    }
  }

  type YandexGeoObjectCollection = {
    add: (obj: unknown) => void
    removeAll: () => void
    getBounds: () => unknown
  }

  type YandexMaps = {
    ready: (cb: () => void) => void
    Map: new (dom: HTMLElement, opts: Record<string, unknown>) => YandexMapInstance
    GeoObjectCollection: new () => YandexGeoObjectCollection
    Placemark: new (
      coords: [number, number],
      props: Record<string, unknown>,
      opts: { preset: string },
    ) => unknown
    geocode: (
      query: string | [number, number],
      params?: Record<string, unknown>,
    ) => Promise<{
      geoObjects: {
        get: (index: number) => {
          geometry: {
            getCoordinates: () => [number, number]
          }
          getAddressLine?: () => string
          properties?: {
            get: (key: string) => unknown
          }
        }
      }
    }>
  }

  interface Window {
    ymaps?: YandexMaps
  }
}

export {}
