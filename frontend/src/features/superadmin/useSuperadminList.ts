import { useCallback, useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { notifyError } from '../../shared/lib/notify'

/**
 * Загрузка списка для кабинета супер-админа.
 * Защита от гонки ответов (Strict Mode, повторный load после создания пользователя):
 * применяем setRows только если это ответ на последний запрос.
 */
export function useSuperadminList<T>(fetchList: () => Promise<{ data: unknown }>, errorFallback: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const seqRef = useRef(0)
  const fetchRef = useRef(fetchList)
  fetchRef.current = fetchList

  const load = useCallback(async () => {
    const seq = ++seqRef.current
    setLoading(true)
    try {
      const { data } = await fetchRef.current()
      if (seq !== seqRef.current) return
      setRows(Array.isArray(data) ? (data as T[]) : [])
    } catch (e) {
      console.error(e)
      if (seq !== seqRef.current) return
      notifyError('Не удалось загрузить список', getErrorMessage(e, errorFallback))
    } finally {
      if (seq !== seqRef.current) return
      setLoading(false)
    }
  }, [errorFallback])

  useEffect(() => {
    void load()
  }, [load])

  return { rows, loading, load }
}
