import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('about.meta')
    return {
        title: t('title'),
        description: t('description'),
    }
}

/** Sample page: its own title and description; canonical, hreflang and Open Graph come from the layout. */
export default async function AboutPage() {
    const t = await getTranslations('about')
    return (
        <article className="grid max-w-3xl gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-balance">{t('heading')}</h1>
            <p className="text-lg text-muted-foreground text-pretty">{t('body')}</p>
        </article>
    )
}
