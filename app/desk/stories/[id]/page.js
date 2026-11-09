import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/desk/guard'
import { canDelete, canEdit, canPublish, getStory } from '@/lib/desk/stories'
import { relativeTime, sectionLabel } from '@/lib/site'
import StoryEditor from '../../StoryEditor'
import styles from '../../desk.module.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const story = await getStory(id)
  return { title: story?.title || 'Story' }
}

export default async function EditStoryPage({ params }) {
  const user = await requireUser()
  const { id } = await params
  const story = await getStory(id)
  if (!story) notFound()

  const editable = canEdit(user, story)
  if (!editable) redirect('/desk/stories')

  return (
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <p className={styles.kicker}>
            {sectionLabel(story.section)} · {story.status === 'published' ? 'Published' : 'Draft'}
          </p>
          <h1 className={styles.title}>{story.title}</h1>
          <p className={styles.lede}>
            {story.authorName} · last saved {relativeTime(story.updatedAt)}
            {story.publishedAt && story.status === 'published' ? ' · published' : ''}
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/desk/stories" className={`${styles.btn} ${styles.btnGhost}`}>
            All stories
          </Link>
          {story.status === 'published' ? (
            <Link
              href={`/news/${story.slug}`}
              className={`${styles.btn} ${styles.btnPrimary}`}
              target="_blank"
              rel="noreferrer"
            >
              View live
            </Link>
          ) : null}
        </div>
      </header>

      <StoryEditor
        user={user}
        story={story}
        editable={editable}
        deletable={canDelete(user, story)}
        canPublishStory={editable && canPublish(user)}
        isAdmin={user.role === 'admin'}
      />
    </>
  )
}
