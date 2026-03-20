import axios from 'axios'

function safeString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

/**
 * Достаёт максимально понятное сообщение об ошибке из axios/Nest.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as unknown
    if (typeof data === 'string') return data || fallback

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      const maybe = obj.message ?? obj.error ?? obj.errors
      const msg = safeString(maybe)
      if (msg) return msg
    }

    return error.message || fallback
  }

  if (error instanceof Error) return error.message || fallback

  const str = safeString(error)
  return str || fallback
}

