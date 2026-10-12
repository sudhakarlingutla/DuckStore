import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../api/client.ts'
import { listDucks } from '../api/ducks.ts'
import type { Duck } from '../domain/duck.ts'

export interface DucksState {
  ducks: Duck[]
  /** True only until the first load finishes. */
  loading: boolean
  /** Why the last load failed, or null if it worked. */
  loadError: string | null
  /** Fetches the list again, for example after a change. */
  reload: () => Promise<void>
}

/** Loads the warehouse listing. The API decides the order. */
export function useDucks(): DucksState {
  const [ducks, setDucks] = useState<Duck[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setDucks(await listDucks())
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // The state is set after the request settles, not synchronously here.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload()
  }, [reload])

  return { ducks, loading, loadError, reload }
}
