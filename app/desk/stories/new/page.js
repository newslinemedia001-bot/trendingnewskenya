import { requireUser } from '@/lib/desk/guard'
import { canPublish } from '@/lib/desk/stories'
import StoryEditor from '../../StoryEditor'
import styles from '../../desk.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'New story',
}

export default async function NewStoryPage() {
  const user = await requireUser()

  return (
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <p className={styles.kicker}>New filing</p>
          <h1 className={styles.title}>Write a story</h1>
          <p className={styles.lede}>
            Save as often as you like. Nothing appears on the site until you publish it.
          </p>
        </div>
      </header>

      <StoryEditor
        user={user}
        story={null}
        editable
        deletable={false}
        canPublishStory={canPublish(user)}
        isAdmin={user.role === 'admin'}
      />
    </>
  )
}
