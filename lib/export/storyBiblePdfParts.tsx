// The story bible PDF's entries, swatches and labels (storyBibleToPdf), set
// as a printed appendix from printTypography and coloured from printColors.

import { View, Text } from '@react-pdf/renderer'
import { swatchColors } from './printColors'
import { BIBLE_ENTRY, ENTRY_NAME, FIELD_LABEL, SWATCH } from './printTypography'

// Small capitals, as far as react-pdf goes: it has no small-caps feature, so
// they're capitals at the label size, letter-spaced.
export const SMALL_CAPS = {
  fontSize: FIELD_LABEL.size,
  letterSpacing: FIELD_LABEL.tracking,
  textTransform: 'uppercase' as const,
  color: FIELD_LABEL.color,
  fontWeight: 400 as const,
}

// One entry (a character, a place): divided from the one before it by a
// hairline rule with space either side. keepTogether: don't split it across
// pages (only for one that fits on a page; the caller estimates).
export function Entry({ first, keepTogether, children }: { first: boolean; keepTogether: boolean; children: React.ReactNode }) {
  return (
    <View
      wrap={!keepTogether}
      style={{
        borderTopWidth: first ? 0 : BIBLE_ENTRY.ruleWidth,
        borderTopColor: BIBLE_ENTRY.ruleColor,
        paddingTop: first ? 0 : BIBLE_ENTRY.gap,
        marginBottom: BIBLE_ENTRY.gap,
      }}
    >
      {children}
    </View>
  )
}

// How far below the middle of its line box a line's capitals are centred,
// as a share of the font size: react-pdf sets Literata's glyphs low in the
// box (measured on the rendered pages).
const CAP_CENTER_DROP = 0.17

// The square of an entry's colour before its name, centred on the capitals
// of a line of text this size and line height, outlined when the colour is
// too pale to see.
export function Swatch({ color, fontSize, lineHeight }: { color: string | null; fontSize: number; lineHeight: number }) {
  const { fill, outlined } = swatchColors(color)
  return (
    <View
      style={{
        width: SWATCH.size,
        height: SWATCH.size,
        marginTop: (fontSize * lineHeight - SWATCH.size) / 2 + fontSize * CAP_CENTER_DROP,
        marginRight: SWATCH.gap,
        backgroundColor: fill,
        ...(outlined ? { borderWidth: SWATCH.outlineWidth, borderColor: SWATCH.outlineColor } : {}),
      }}
    />
  )
}

// A name with its swatch, and after it the role or type in small capitals.
// slim: an entry with no details, set a little smaller.
export function NameLine({
  color,
  name,
  detail,
  slim = false,
  marginBottom = 0,
}: {
  color: string | null
  name: string
  detail: string | null
  slim?: boolean
  marginBottom?: number
}) {
  const size = slim ? ENTRY_NAME.slimSize : ENTRY_NAME.size
  const lineHeight = slim ? ENTRY_NAME.slimLineHeight : ENTRY_NAME.lineHeight
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom }}>
      <Swatch color={color} fontSize={size} lineHeight={lineHeight} />
      <Text style={{ flex: 1, fontSize: size, lineHeight, fontWeight: 700 }}>
        {name}
        {detail && <Text style={SMALL_CAPS}>{`   ${detail}`}</Text>}
      </Text>
    </View>
  )
}

// A field heading in small capitals ("NOTES"), kept with the line after it.
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      minPresenceAhead={FIELD_LABEL.size * 3}
      style={{
        ...SMALL_CAPS,
        lineHeight: FIELD_LABEL.lineHeight,
        marginTop: FIELD_LABEL.before,
        marginBottom: FIELD_LABEL.after,
      }}
    >
      {children}
    </Text>
  )
}
