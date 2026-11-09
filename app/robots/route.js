export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const base = 'https://trendingnewskenya.co.ke'
  const now = new Date().toISOString().split('T')[0]

  const policies = `User-agent: *
Allow: /
Disallow: /wp-admin/
Disallow: /private/

Sitemap: ${base}/sitemap.xml
`

  return new Response(policies, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}