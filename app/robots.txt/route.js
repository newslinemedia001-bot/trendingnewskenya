import { siteUrl } from '@/lib/site'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const base = siteUrl()

  // Search engines, social crawlers and AI answer engines are all welcome to
  // read and cite the site. Being explicit here is what lets engines like
  // ChatGPT, Gemini/Copilot, Claude and Perplexity retrieve and quote our
  // reporting instead of skipping it.
  const policies = `# Trending News Kenya — crawler policy
# Search and AI answer engines may read, index and cite this site.

User-agent: *
Allow: /
Disallow: /wp-admin/
Disallow: /private/

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${base}/sitemap.xml
Sitemap: ${base}/sitemap-news.xml
`

  return new Response(policies, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
