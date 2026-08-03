'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CharacterNode, NODE_WIDTH, NODE_HEIGHT } from './CharacterNode'
import {
  getFamilyTreeMembers,
  saveFamilyTreeMemberPosition,
  removeFamilyTreeMember,
  deleteRelationship,
} from '@/actions/characters'
import type { Character, CharacterRelationship, FamilyTreeMember } from '@/types/database'

const CANVAS_WIDTH = 2400
const CANVAS_HEIGHT = 1400

const SYMMETRIC_TYPES = new Set(['sibling', 'spouse', 'friend', 'enemy', 'rival', 'other'])

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

export function RelationshipCanvas({
  projectId,
  treeId,
  characters,
  relationships,
  selectedCharacterId,
  pendingSourceId,
  onNodeClick,
  onBackgroundClick,
  onRelationshipDeleted,
}: RelationshipCanvasProps) {
  // This component is remounted via `key={treeId}` by the parent, so member
  // state naturally resets when switching trees.
  const [members, setMembers] = useState<FamilyTreeMember[]>([])
  const [dragOver, setDragOver] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getFamilyTreeMembers(treeId)
      if (!cancelled) setMembers(data)
    })()
    return () => {
      cancelled = true
    }
  }, [treeId])

  function handleDragMove(characterId: string, x: number, y: number) {
    setMembers((prev) => prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m)))
  }

  function handleDragEnd(characterId: string, x: number, y: number) {
    setMembers((prev) => prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m)))
    saveFamilyTreeMemberPosition(treeId, characterId, x, y)
  }

  function handleRemoveMember(characterId: string) {
    setMembers((prev) => prev.filter((m) => m.character_id !== characterId))
    removeFamilyTreeMember(treeId, characterId)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const characterId = e.dataTransfer.getData('text/plain')
    if (!characterId || !contentRef.current) return

    const rect = contentRef.current.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left - NODE_WIDTH / 2)
    const y = Math.max(0, e.clientY - rect.top - NODE_HEIGHT / 2)

    setMembers((prev) => {
      const exists = prev.some((m) => m.character_id === characterId)
      if (exists) return prev.map((m) => (m.character_id === characterId ? { ...m, x, y } : m))
      return [
        ...prev,
        { tree_id: treeId, character_id: characterId, x, y, created_at: new Date().toISOString() },
      ]
    })
    saveFamilyTreeMemberPosition(treeId, characterId, x, y)
  }

  async function handleDeleteRelationship(id: string) {
    onRelationshipDeleted(id)
    await deleteRelationship(id, projectId)
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onBackgroundClick()
  }

  const charactersById = new Map(characters.map((c) => [c.id, c]))
  // Relationships where only one side is placed on this tree simply don't draw a
  // line — they still show up in the character detail panel either way, since
  // that view isn't scoped to a single tree.
  const positions = new Map(members.map((m) => [m.character_id, { x: m.x, y: m.y }]))

  return (
    <div
      className={cn(
        'relative h-full overflow-auto scrollbar-thin bg-secondary/10 transition-colors',
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
                className="relative opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-opacity after:absolute after:-inset-1.5"
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

        {members.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none">
            <p className="text-sm text-muted-foreground text-center max-w-64">
              {characters.length === 0
                ? 'Add a character in the sidebar to get started.'
                : 'Drag a character from the sidebar onto the canvas to add them to this tree.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
