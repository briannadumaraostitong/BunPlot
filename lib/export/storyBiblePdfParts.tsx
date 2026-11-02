// The story bible PDF's cards and labels (storyBibleToPdf), styled from
// printTypography and coloured from printColors, as storyBibleDocxParts are
// in the DOCX.

import { View, Text } from '@react-pdf/renderer'
import { cardColors, labelColors, type CardLabel } from './printColors'
import { CARD, CARD_PADDING_BOTTOM, FIELD_LABEL, LABEL } from './printTypography'

// keepTogether: don't split the card across pages. Only for a card that fits
// on one (the caller estimates); a taller one has to split anyway.
export function Card({
  color,
  keepTogether,
  children,
}: {
  color: string | null
  keepTogether: boolean
  children: React.ReactNode
}) {
  const { accent, tint } = cardColors(color)
  return (
    <View
      wrap={!keepTogether}
      style={{
        borderLeftWidth: CARD.accentWidth,
        borderLeftColor: accent,
        backgroundColor: tint,
        borderRadius: CARD.radius,
        paddingTop: CARD.paddingY,
        paddingBottom: CARD_PADDING_BOTTOM,
        paddingHorizontal: CARD.paddingX,
        marginBottom: CARD.gap,
      }}
    >
      {children}
    </View>
  )
}

// Labels in a row, wrapping onto another line when they don't fit.
export function Labels({ labels }: { labels: CardLabel[] }) {
  if (labels.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {labels.map((label, i) => {
        const { background, text } = labelColors(label.color)
        return (
          <Text
            key={i}
            style={{
              fontSize: LABEL.size,
              lineHeight: 1.2,
              color: text,
              backgroundColor: background,
              // Fully rounded ends: half the pill's height.
              borderRadius: (LABEL.size * 1.2) / 2 + LABEL.paddingY,
              paddingHorizontal: LABEL.paddingX,
              paddingVertical: LABEL.paddingY,
              marginRight: LABEL.gap,
              marginBottom: LABEL.gap,
            }}
          >
            {label.text}
          </Text>
        )
      })}
    </View>
  )
}

// A card's field heading ("NOTES"), kept with the line after it.
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      minPresenceAhead={FIELD_LABEL.size * 3}
      style={{
        fontSize: FIELD_LABEL.size,
        lineHeight: FIELD_LABEL.lineHeight,
        letterSpacing: FIELD_LABEL.tracking,
        textTransform: 'uppercase',
        color: FIELD_LABEL.color,
        marginTop: FIELD_LABEL.before,
        marginBottom: FIELD_LABEL.after,
      }}
    >
      {children}
    </Text>
  )
}
