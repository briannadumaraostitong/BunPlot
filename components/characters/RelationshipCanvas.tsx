'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CharacterNode, NODE_WIDTH, NODE_HEIGHT } from './CharacterNode'
import {
  getFamilyTreeMembers,
  saveFamilyTreeMemberPosition,
  removeFamilyTreeMember,
  deleteRelationship,
} from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import { LoadError } from '@/components/ui/load-error'
import type { Character, CharacterRelationship, FamilyTreeMember } from '@/types/database'

const CANVAS_WIDTH = 2400
const CANVAS_HEIGHT = 1400

const SYMMETRIC_TYPES = new Set(['sibling', 'spouse', 'friend', 'enemy', 'rival', 'other'])

// Shared by drag saves and adds, so a failing drag session shows one toast.
const TREE_LAYOUT_TOAST_ID = 'tree-layout'

function saveMemberPosition(treeId: string, characterId: string, x: number, y: number) {
  return settle(saveFamilyTreeMemberPosition(treeId, characterId, x, y))
}

export interface RelationshipCanvasHandle {
  // Mobile fallback for CharacterRow's native-HTML5-drag add-to-canvas, which
  // doesn't fire on touch — places the character centered in whatever's
  // currently scrolled into view instead of at a drop coordinate.
  addCharacterToCanvas: (characterId: string) => void
}

interface RelationshipCanvasProps {
  projectId: string
  treeId: string
  characters: Character[]
  relationships: CharacterRelationship[]
  selectedCharacterId: string | null
  pendingSourceId: string | null
  onNodeClick: (character: Character) => void
  onBackgroundClick: () => void
  onRelationshipDeleted: (id: string) => void
}

export const RelationshipCanvas = forwardRef<RelationshipCanvasHandle, RelationshipCanvasProps>(
  function RelationshipCanvas(
    {
      projectId,
      treeId,
      characters,
      relationships,
      selectedCharacterId,
      pendingSourceId,
      onNodeClick,
      onBackgroundClick,
      onRelationshipDeleted,
    },
    ref
  ) {
    // This component is remounted via `key={treeId}` by the parent, so member
    // state naturally resets when switching trees.
    const [members, setMembers] = useState<FamilyTreeMember[]>([])
    const [loadFailed, setLoadFailed] = useState(false)
    // Bumped by Retry to re-run the load effect.
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [dragOver, setDragOver] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      let cancelled = false
      ;(async () => {
        const result = await settle(getFamilyTreeMembers(treeId))
        if (cancelled) return
        if ('error' in result) {
          console.error('Load family tree members error:', result.error)
          setLoadFailed(true)
          return
        }
        setMembers(result)
      })()
      return () => {
        cancelled = true
      }
    }, [treeId, loadAttempt])

    // Memoized so the imperative handle below can list it as a dependency
    // without being rebuilt on every render; it changes exactly when
    // `members` does, which is when the handle already rebuilds.
    const addOrUpdateMember = useCallback(
      (characterId: string, x: number, y: number) => {
        const isNew = !members.some((m) => m.character_id === characterId)
        setMembers((prev) => {
          const exists = prev.some((m) => m.character_id === characterId)
          if (exists) return prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m))
          return [
            ...prev,
            { tree_id: treeId, character_id: characterId, x, y, created_at: new Date().toISOString() },
          ]
        })
        saveMemberPosition(treeId, characterId, x, y).then((result) => {
          const message = isNew ? "Couldn't add the character to the tree." : "Couldn't save the family tree layout."
          if (reportResult(result, message, { id: TREE_LAYOUT_TOAST_ID }) || !isNew) return
          // A new member that never saved: take it back off the canvas. A moved
          // one keeps its new spot (toast only, like other drags).
          setMembers((prev) => prev.filter((m) => m.character_id !== characterId))
        })
      },
      [members, treeId]
    )

    useImperativeHandle(
      ref,
      () => ({
        addCharacterToCanvas(characterId: string) {
          // The tree's real members are unknown, so adding would place a
          // character onto what only looks like an empty tree.
          if (loadFailed) return
          // Already placed — leave it where it is rather than surprise-move it.
          if (members.some((m) => m.character_id === characterId)) return

          const scrollEl = scrollRef.current
          const scrollLeft = scrollEl?.scrollLeft ?? 0
          const scrollTop = scrollEl?.scrollTop ?? 0
          const viewWidth = scrollEl?.clientWidth ?? 0
          const viewHeight = scrollEl?.clientHeight ?? 0
          // Small cascade so several taps in a row don't stack exactly on top
          // of each other.
          const cascade = (members.length % 6) * 24
          const x = Math.max(0, scrollLeft + viewWidth / 2 - NODE_WIDTH / 2 + cascade)
          const y = Math.max(0, scrollTop + viewHeight / 2 - NODE_HEIGHT / 2 + cascade)
          addOrUpdateMember(characterId, x, y)
        },
      }),
      [members, loadFailed, addOrUpdateMember]
    )

    function handleDragMove(characterId: string, x: number, y: number) {
      setMembers((prev) => prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m)))
    }

    function handleDragEnd(characterId: string, x: number, y: number) {
      setMembers((prev) => prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m)))
      saveMemberPosition(treeId, characterId, x, y).then((result) =>
        reportResult(result, "Couldn't save the family tree layout.", { id: TREE_LAYOUT_TOAST_ID })
      )
    }

    async function handleRemoveMember(characterId: string) {
      const removed = members.find((m) => m.character_id === characterId)
      setMembers((prev) => prev.filter((m) => m.character_id !== characterId))
      const result = await settle(removeFamilyTreeMember(treeId, characterId))
      if (!reportResult(result, "Couldn't remove the character from the tree.") && removed) {
        setMembers((prev) => [...prev, removed])
      }
    }

    function handleDrop(e: React.DragEvent) {
      e.preventDefault()
      setDragOver(false)
      const characterId = e.dataTransfer.getData('text/plain')
      if (!characterId || !contentRef.current) return

      const rect = contentRef.current.getBoundingClientRect()
      const x = Math.max(0, e.clientX - rect.left - NODE_WIDTH / 2)
      const y = Math.max(0, e.clientY - rect.top - NODE_HEIGHT / 2)

      addOrUpdateMember(characterId, x, y)
    }

    async function handleDeleteRelationship(id: string) {
      // Removed from the canvas only once the delete succeeds, so a failure
      // leaves it where it was.
      const result = await settle(deleteRelationship(id, projectId))
      if (reportResult(result, "Couldn't delete the relationship.")) onRelationshipDeleted(id)
    }

    function handleCanvasClick(e: React.MouseEvent) {
      if (e.target === e.currentTarget) onBackgroundClick()
    }

    const charactersById = new Map(characters.map((c) => [c.id, c]))
    // Relationships where only one side is placed on this tree simply don't draw a
    // line — they still show up in the character detail panel either way, since
    // that view isn't scoped to a single tree.
    const positions = new Map(members.map((m) => [m.character_id, { x: m.x, y: m.y }]))

    // After every hook, so the early return can't change their order.
    if (loadFailed) {
      return (
        <div className="flex h-full items-center justify-center bg-secondary/10 p-4">
          <LoadError
            thing="this family tree"
            onRetry={() => {
              setLoadFailed(false)
              setLoadAttempt((n) => n + 1)
            }}
          />
        </div>
      )
    }

    return (
      <div className="relative h-full">
        <div
          ref={scrollRef}
          className={cn(
            'h-full overflow-auto scrollbar-thin bg-secondary/10 transition-colors',
            dragOver && 'bg-accent/5'
          )}
        >
          <div
            ref={contentRef}
            className="relative"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            onClick={handleCanvasClick}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <svg className="absolute inset-0 pointer-events-none" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
              <defs>
                <marker id="rel-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" className="fill-muted-foreground" />
                </marker>
              </defs>
              {relationships.map((rel) => {
                const source = positions.get(rel.source_character_id)
                const target = positions.get(rel.target_character_id)
                if (!source || !target) return null
                const symmetric = SYMMETRIC_TYPES.has(rel.relationship_type)
                return (
                  <line
                    key={rel.id}
                    x1={source.x + NODE_WIDTH / 2}
                    y1={source.y + NODE_HEIGHT / 2}
                    x2={target.x + NODE_WIDTH / 2}
                    y2={target.y + NODE_HEIGHT / 2}
                    className="stroke-muted-foreground/50"
                    strokeWidth={1.5}
                    markerEnd={symmetric ? undefined : 'url(#rel-arrow)'}
                  />
                )
              })}
            </svg>

            {relationships.map((rel) => {
              const source = positions.get(rel.source_character_id)
              const target = positions.get(rel.target_character_id)
              if (!source || !target) return null
              const midX = (source.x + target.x) / 2 + NODE_WIDTH / 2
              const midY = (source.y + target.y) / 2 + NODE_HEIGHT / 2
              return (
                <div
                  key={rel.id}
                  className="group absolute z-10 flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm"
                  style={{ left: midX, top: midY }}
                >
                  <span className="capitalize">{rel.relationship_label || rel.relationship_type}</span>
                  <button
                    onClick={() => handleDeleteRelationship(rel.id)}
                    className="relative opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-opacity after:absolute after:-inset-1.5"
                    title="Remove relationship"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )
            })}

            {members.map((member) => {
              const character = charactersById.get(member.character_id)
              if (!character) return null
              return (
                <CharacterNode
                  key={character.id}
                  character={character}
                  x={member.x}
                  y={member.y}
                  selected={character.id === selectedCharacterId}
                  pending={character.id === pendingSourceId}
                  onClick={() => onNodeClick(character)}
                  onDragMove={(x, y) => handleDragMove(character.id, x, y)}
                  onDragEnd={(x, y) => handleDragEnd(character.id, x, y)}
                  onRemoveFromTree={() => handleRemoveMember(character.id)}
                />
              )
            })}
          </div>
        </div>

        {members.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none">
            <p className="text-sm text-muted-foreground text-center max-w-64">
              {characters.length === 0
                ? 'Add a character in the sidebar to get started.'
                : 'Add a character from the sidebar to place them on this tree.'}
            </p>
          </div>
        )}
      </div>
    )
  }
)
