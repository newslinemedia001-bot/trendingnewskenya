import Link from 'next/link'
import styles from '@/app/article.module.css'

/**
 * Splits plain-text bodies on blank lines, recognising the small set of markers
 * editors actually use: "## " for a subhead, "> " for a pull quote, "- " lists.
 */
export function parseBody(content) {
  const lines = String(content || '').split(/\r?\n/)
  const blocks = []
  let paragraph = []
  let list = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list })
      list = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3) })
      continue
    }
    if (line.startsWith('> ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'quote', text: line.slice(2) })
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2))
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

/**
 * Places "Read also" lines inside the body the way the Kenyan news sites do:
 * one after the second paragraph, and for long reads a second one further down.
 * Never trails the last paragraph, so a story always ends on its own copy.
 */
export function insertReadAlso(blocks, links = []) {
  if (!links.length) return blocks

  const paragraphs = blocks.reduce(
    (acc, block, index) => (block.type === 'p' ? [...acc, index] : acc),
    []
  )
  if (!paragraphs.length) return blocks

  // Prefer paragraphs that are not the closing one, so a story still ends on
  // its own copy. Wire summaries arrive as one long paragraph, so fall back to
  // that single block and place the line after it.
  const interior = paragraphs.filter((index) => index !== blocks.length - 1)
  const picks = interior.length ? interior : paragraphs

  const slots = [picks[Math.min(1, picks.length - 1)]]
  if (links.length > 1 && picks.length >= 4) {
    const later = picks[Math.min(picks.length - 1, Math.round(picks.length * 0.7))]
    if (!slots.includes(later)) slots.push(later)
  }

  const placed = new Map()
  slots.forEach((slot, i) => {
    if (links[i]) placed.set(slot, links[i])
  })
  if (!placed.size) return blocks

  const out = []
  blocks.forEach((block, index) => {
    out.push(block)
    if (placed.has(index)) out.push({ type: 'readAlso', link: placed.get(index) })
  })
  return out
}

export default function ArticleBody({ content, readAlso = [] }) {
  const blocks = insertReadAlso(parseBody(content), readAlso)
  if (!blocks.length) {
    return <p className={styles.emptyBody}>This story has no body yet.</p>
  }

  return (
    <div className={styles.body}>
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h2 key={index} className={styles.subhead}>
              {block.text}
            </h2>
          )
        }
        if (block.type === 'readAlso') {
          return (
            <p key={index} className={styles.readAlso}>
              <span className={styles.readAlsoLabel}>Read also</span>{' '}
              <Link href={block.link.href} className={styles.readAlsoLink}>
                {block.link.title}
              </Link>
            </p>
          )
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={index} className={styles.pullquote}>
              {block.text}
            </blockquote>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className={styles.bodyList}>
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className={index === 0 ? styles.lede : undefined}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
