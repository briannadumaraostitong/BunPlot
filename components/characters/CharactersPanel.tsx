'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarRowSkeleton } from '@/components/ui/sidebar-skeleton-row'
import { CharacterSidebar } from './CharacterSidebar'
import { FamilyTreeTabBar } from './FamilyTreeTabBar'
import { RelationshipCanvas, type RelationshipCanvasHandle } from './RelationshipCanvas'
import { CharacterDetailPanel } from './CharacterDetailPanel'
import { RelationshipModal } from './RelationshipModal'
import {
  getCharacters,
  getRelationships,
  getFamilyTrees,
  createFamilyTree,
  renameFamilyTree,
  deleteFamilyTree,
} from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import type { Character, CharacterRelationship, FamilyTree } from '@/types/database'

interface CharactersPanelProps {
  projectId: string
  initialSelectedCharacterId?: string
}

export function CharactersPanel({ projectId, initialSelectedCharacterId }: CharactersPanelProps) {
  const [loading, setLoading] = useState(true)
  const [characters, setCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([])
  const [trees, setTrees] = useState<FamilyTree[]>([])
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null)

  // Trusts the deep-linked id until the fetch below resolves and validates
  // it against the real character list, clearing it if unmatched — a
  // stale/bad id would otherwise open CharacterDetailPanel with
  // open: true and character: null (same failure mode fixed in
  // TimelineCanvas, handled differently here since characters load async
  // rather than being available synchronously via a prop).
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    initialSelectedCharacterId ?? null
  )
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<{
    open: boolean
    source: Character | null
    target: Character | null
  }>({ open: false, source: null, target: null })

  const canvasRef = useRef<RelationshipCanvasHandle>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [charactersData, relationshipsData, treesData] = await Promise.all([
        getCharacters(projectId),
        getRelationships(projectId),
        getFamilyTrees(projectId),
      ])
      if (cancelled) return
      setCharacters(charactersData)
      setRelationships(relationshipsData)
      setTrees(treesData)
      setActiveTreeId(treesData[0]?.id ?? null)
      setSelectedCharacterId((current) =>
        current && !charactersData.some((c) => c.id === current) ? null : current
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPendingSourceId(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const relatedCharacterIds = useMemo(
    () => new Set(relationships.flatMap((r) => [r.source_character_id, r.target_character_id])),
    [relationships]
  )

  function handleNodeClick(character: Character) {
    if (pendingSourceId) {
      if (pendingSourceId === character.id) {
        setPendingSourceId(null)
        return
      }
      const source = characters.find((c) => c.id === pendingSourceId) ?? null
      setModalState({ open: true, source, target: character })
      setPendingSourceId(null)
      return
    }
    setSelectedCharacterId(character.id)
  }

  function handleStartConnect() {
    if (selectedCharacterId) setPendingSourceId(selectedCharacterId)
  }

  function handleCancelConnect() {
    setPendingSourceId(null)
  }

  // Mobile fallback for CharacterRow's native-HTML5-drag add-to-canvas,
  // which doesn't fire on touch — see RelationshipCanvasHandle.
  function handleAddCharacterToCanvas(characterId: string) {
    canvasRef.current?.addCharacterToCanvas(characterId)
  }

  async function handleRelationshipCreated() {
    setModalState({ open: false, source: null, target: null })
    const data = await getRelationships(projectId)
    setRelationships(data)
  }

  function handleRelationshipDeleted(id: string) {
    setRelationships((prev) => prev.filter((r) => r.id !== id))
  }

  function handleCharacterUpdated(id: string, updates: Partial<Character>) {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  async function handleAddTree() {
    const created = await createFamilyTree(projectId, `Family Tree ${trees.length + 1}`)
    if ('error' in created) return
    setTrees((prev) => [...prev, created])
    setActiveTreeId(created.id)
  }

  function handleRenameTree(id: string, name: string) {
    setTrees((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
    renameFamilyTree(id, projectId, name)
  }

  async function handleDeleteTree(id: string) {
    const result = await settle(deleteFamilyTree(id, projectId))
    if (!reportResult(result, "Couldn't delete the family tree.")) return
    const remaining = trees.filter((t) => t.id !== id)
    setTrees(remaining)
    setActiveTreeId((current) => (current === id ? (remaining[0]?.id ?? null) : current))
  }

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* CharacterSidebar */}
        <div className="hidden md:flex w-52 flex-col border-r border-border shrink-0">
          <div className="h-10 border-b border-border flex items-center px-2">
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex-1 py-1 space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SidebarRowSkeleton key={i} dot="circle" />
            ))}
          </div>
          <div className="p-2 border-t border-border">
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {/* FamilyTreeTabBar */}
          <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border px-2">
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>

          {/* Canvas — a few loosely-scattered node placeholders, not real
              positions (character x/y is entirely data-dependent), just
              enough to suggest content is coming. */}
          <div className="relative flex-1 bg-secondary/10 overflow-hidden">
            <Skeleton className="absolute left-[15%] top-[20%] h-16 w-32 rounded-lg" />
            <Skeleton className="absolute left-[45%] top-[40%] h-16 w-32 rounded-lg" />
            <Skeleton className="absolute left-[25%] top-[60%] h-16 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      <CharacterSidebar
        projectId={projectId}
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        relatedCharacterIds={relatedCharacterIds}
        onSelect={setSelectedCharacterId}
        onCharacterAdded={(character) => setCharacters((prev) => [...prev, character])}
        onCharacterColorChanged={(id, color) => handleCharacterUpdated(id, { color })}
        onCharacterDeleted={(id) => {
          setCharacters((prev) => prev.filter((c) => c.id !== id))
          setSelectedCharacterId((current) => (current === id ? null : current))
        }}
        onAddToCanvas={handleAddCharacterToCanvas}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <FamilyTreeTabBar
          trees={trees}
          activeId={activeTreeId}
          onSelect={setActiveTreeId}
          onAdd={handleAddTree}
          onRename={handleRenameTree}
          onDelete={handleDeleteTree}
        />

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {pendingSourceId && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 rounded-full px-3 py-1 text-[11px] font-medium text-white shadow-md"
              style={{ backgroundColor: 'hsl(var(--accent))' }}
            >
              Click a character on the canvas to connect — Esc to cancel
            </div>
          )}

          {activeTreeId && (
            <RelationshipCanvas
              key={activeTreeId}
              ref={canvasRef}
              projectId={projectId}
              treeId={activeTreeId}
              characters={characters}
              relationships={relationships}
              selectedCharacterId={selectedCharacterId}
              pendingSourceId={pendingSourceId}
              onNodeClick={handleNodeClick}
              onBackgroundClick={() => setPendingSourceId(null)}
              onRelationshipDeleted={handleRelationshipDeleted}
            />
          )}

          <CharacterDetailPanel
            character={selectedCharacter}
            characters={characters}
            relationships={relationships}
            open={selectedCharacterId !== null}
            pending={selectedCharacterId !== null && selectedCharacterId === pendingSourceId}
            onClose={() => setSelectedCharacterId(null)}
            onUpdated={handleCharacterUpdated}
            onSelectRelated={setSelectedCharacterId}
            onStartConnect={handleStartConnect}
            onCancelConnect={handleCancelConnect}
          />
        </div>
      </div>

      <RelationshipModal
        projectId={projectId}
        source={modalState.source}
        target={modalState.target}
        open={modalState.open}
        onClose={() => setModalState({ open: false, source: null, target: null })}
        onCreated={handleRelationshipCreated}
      />
    </div>
  )
}
