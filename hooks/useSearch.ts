'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SearchResult } from '@/types/database'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export type SearchStatus = 'idle' | 'loading' | 'empty' | 'results' | 'error'

// The last finished search, tagged with the query and project it was for.
// Idle and loading aren't stored: they're worked out during render from
// whether the current query matches this.
interface SettledSearch {
  key: string
  results: SearchResult[]
  error: string | null
  status: 'empty' | 'results' | 'error'
}

export function useSearch(query: string, projectId: string | null) {
  const [settled, setSettled] = useState<SettledSearch | null>(null)
  // Bumped by retry(). Part of the key, so a retry counts as a new search:
  // the effect re-runs, and the status shows 'loading' until it settles,
  // instead of staying on the old error.
  const [attempt, setAttempt] = useState(0)

  const trimmed = query.trim()
  const active = trimmed.length >= MIN_QUERY_LENGTH
  const key = JSON.stringify([projectId, trimmed, attempt])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guards against an earlier, slower request's response arriving after a
  // later one's and clobbering fresher results — same race StatusPicker's
  // color-debounce comment already flags for a single in-flight request.
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!active) {
      requestIdRef.current++ // invalidates any request still in flight
      return
    }

    debounceRef.current = setTimeout(async () => {
      const thisRequestId = ++requestIdRef.current
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('search_entities', {
        p_query: trimmed,
        p_project_id: projectId,
      } as never)

      if (thisRequestId !== requestIdRef.current) return // superseded, ignore

      if (rpcError) {
        setSettled({ key, results: [], error: rpcError.message, status: 'error' })
        return
      }

      const rows = (data ?? []) as SearchResult[]
      setSettled({ key, results: rows, error: null, status: rows.length === 0 ? 'empty' : 'results' })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [active, key, trimmed, projectId])

  function retry() {
    setAttempt((n) => n + 1)
  }

  if (!active) return { results: [], isLoading: false, error: null, status: 'idle' as SearchStatus, retry }
  // A different query than the last finished one: still waiting for it.
  // The previous results are kept, as before; the page only shows them
  // once the status is 'results'.
  if (settled?.key !== key) {
    return { results: settled?.results ?? [], isLoading: true, error: null, status: 'loading' as SearchStatus, retry }
  }
  return { results: settled.results, isLoading: false, error: settled.error, status: settled.status as SearchStatus, retry }
}
