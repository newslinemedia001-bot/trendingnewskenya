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

export default function ArticleBody({ content }) {
  const blocks = parseBody(content)
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
