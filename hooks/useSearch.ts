'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SearchResult } from '@/types/database'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export type SearchStatus = 'idle' | 'loading' | 'empty' | 'results' | 'error'

export function useSearch(query: string, projectId: string | null) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SearchStatus>('idle')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guards against an earlier, slower request's response arriving after a
  // later one's and clobbering fresher results — same race StatusPicker's
  // color-debounce comment already flags for a single in-flight request.
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current++ // invalidates any request still in flight
      setResults([])
      setIsLoading(false)
      setError(null)
      setStatus('idle')
      return
    }

    setIsLoading(true)
    setStatus('loading')

    debounceRef.current = setTimeout(async () => {
      const thisRequestId = ++requestIdRef.current
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('search_entities', {
        p_query: trimmed,
        p_project_id: projectId,
      } as never)

      if (thisRequestId !== requestIdRef.current) return // superseded, ignore

      if (rpcError) {
        setError(rpcError.message)
        setResults([])
        setIsLoading(false)
        setStatus('error')
        return
      }

      const rows = (data ?? []) as SearchResult[]
      setResults(rows)
      setIsLoading(false)
      setError(null)
      setStatus(rows.length === 0 ? 'empty' : 'results')
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, projectId])

  return { results, isLoading, error, status }
}
