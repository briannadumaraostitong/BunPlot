import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { renderBlocks, SERVER_FONTS_DIR, styles as outlineStyles } from './outlineToPdf'
import { registerPdfFonts } from './pdfFonts'
import type { BlockNode } from './outlineIR'
import type { StoryBible } from './storyBible'

// Heading scheme mirrors storyBibleToDocx: each section is its own page with
// the outline export's title style, entries use heading2, subsections
// heading3. Rich-text headings were already shifted by buildStoryBible (level
// 4+ in places), but the outline renderer styles every level
// past 3 as heading3 — so in PDF, place headings match the "Description" /
// "Notes" subheading size rather than sitting visibly below it.
const styles = StyleSheet.create({
  coverTitle: { fontSize: 32, fontWeight: 700, marginTop: 200, textAlign: 'center' },
  coverSubtitle: { fontSize: 14, marginTop: 12, textAlign: 'center', color: '#555555' },
  meta: { fontSize: 10, marginBottom: 4, color: '#444444' },
  metaLabel: { fontWeight: 700 },
  empty: { fontStyle: 'italic', color: '#555555' },
  entry: { marginBottom: 10 },
})

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <Text style={styles.meta}>
      <Text style={styles.metaLabel}>{`${label}: `}</Text>
      {value}
    </Text>
  )
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <Text key={i} style={outlineStyles.paragraph}>
          {text}
        </Text>
      ))}
    </>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <View key={i} style={outlineStyles.listRow}>
          <Text style={outlineStyles.listMarker}>{'•'}</Text>
          <Text style={outlineStyles.listContent}>{text}</Text>
        </View>
      ))}
    </>
  )
}

function Section({ title, isEmpty, emptyText, children }: {
  title: string
  isEmpty: boolean
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <Page size="A4" style={outlineStyles.page} wrap>
      <Text style={outlineStyles.title}>{title}</Text>
      {isEmpty ? <Text style={[outlineStyles.paragraph, styles.empty]}>{emptyText}</Text> : children}
    </Page>
  )
}

async function richSubsection(title: string, blocks: BlockNode[]) {
  if (blocks.length === 0) return null
  return (
    <View>
      <Text style={outlineStyles.heading3}>{title}</Text>
      {await renderBlocks(blocks)}
    </View>
  )
}

export async function renderStoryBibleToPdf(bible: StoryBible): Promise<Buffer> {
  // Pages use the outline export's page style, which carries the font stack.
  registerPdfFonts(SERVER_FONTS_DIR)
  const pages: React.ReactNode[] = [
    <Page key="cover" size="A4" style={outlineStyles.page}>
      <Text style={styles.coverTitle}>{bible.title}</Text>
      <Text style={styles.coverSubtitle}>Story Bible</Text>
    </Page>,
  ]

  if (bible.characters) {
    const { entries, familyTrees } = bible.characters
    pages.push(
      <Section key="characters" title="Characters" isEmpty={entries.length === 0} emptyText="No characters yet.">
        {entries.map((c, i) => (
          <View key={i} style={styles.entry}>
            <Text style={outlineStyles.heading2}>{c.name}</Text>
            <Meta label="Role" value={c.role} />
            <Paragraphs items={c.description ? c.description.split('\n').filter((l) => l.trim()) : []} />
            {c.relationships.length > 0 && (
              <>
                <Text style={outlineStyles.heading3}>Relationships</Text>
                <Bullets items={c.relationships} />
              </>
            )}
          </View>
        ))}
        {familyTrees.length > 0 && (
          <View>
            <Text style={outlineStyles.heading2}>Family Trees</Text>
            {familyTrees.map((tree, i) => (
              <View key={i} style={styles.entry}>
                <Text style={outlineStyles.heading3}>{tree.name}</Text>
                <Meta label="Members" value={tree.members.length > 0 ? tree.members.join(', ') : 'None'} />
                <Bullets items={tree.relationships} />
              </View>
            ))}
          </View>
        )}
      </Section>
    )
  }

  if (bible.places) {
    const entries = await Promise.all(
      bible.places.map(async (p, i) => (
        <View key={i} style={styles.entry}>
          <Text style={outlineStyles.heading2}>{p.name}</Text>
          <Meta label="Type" value={p.type} />
          {await richSubsection('Description', p.description)}
          {await richSubsection('Notes', p.notes)}
        </View>
      ))
    )
    pages.push(
      <Section key="places" title="Places" isEmpty={bible.places.length === 0} emptyText="No places yet.">
        {entries}
      </Section>
    )
  }

  if (bible.timeline) {
    pages.push(
      <Section key="timeline" title="Timeline" isEmpty={bible.timeline.length === 0} emptyText="No events yet.">
        {bible.timeline.map((group, gi) => (
          <View key={gi}>
            <Text style={outlineStyles.heading2}>{group.heading}</Text>
            {group.events.map((e, ei) => (
              <View key={ei} style={styles.entry}>
                <Text style={outlineStyles.heading3}>{e.title}</Text>
                <Meta label="Layer" value={e.layer} />
                <Meta label="Status" value={e.status} />
                <Meta label="Dates" value={e.dates} />
                <Meta label="Characters" value={e.characters.join(', ') || null} />
                <Meta label="Places" value={e.places.join(', ') || null} />
                <Paragraphs items={e.description} />
                {e.notes.length > 0 && (
                  <>
                    <Text style={[outlineStyles.paragraph, styles.metaLabel]}>Notes</Text>
                    <Paragraphs items={e.notes} />
                  </>
                )}
              </View>
            ))}
          </View>
        ))}
      </Section>
    )
  }

  return renderToBuffer(<Document>{pages}</Document>)
}
