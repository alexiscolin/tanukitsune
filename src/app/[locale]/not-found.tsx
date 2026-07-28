import { DEFAULT_LOCALE } from '@/core/locales'
import { copyFor } from '@/core/site-copy'
import { PageShell } from '@/ui/page-shell'

// Rendered when the page rejects the segment, which is where the rejection has
// to happen: a notFound thrown from the layout skips that layout's own html
// element, and this page then renders with no lang attribute.
export default function NotFound() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold">{copyFor(DEFAULT_LOCALE).notFound}</h1>
    </PageShell>
  )
}
