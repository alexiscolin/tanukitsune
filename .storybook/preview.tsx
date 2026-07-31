import type { Preview } from '@storybook/nextjs-vite'

import { PageShell } from '../src/ui/page-shell'
import '../src/app/globals.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      // The colour scheme beside the attribute, as src/app/[locale]/layout.tsx sets it: it
      // is what stops controls, scrollbars and the page background from rendering light
      // under a dark theme.
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme

      // Wrapped so a state is measured in the width and the rhythm it will actually have.
      return (
        <PageShell>
          <Story />
        </PageShell>
      )
    },
  ],
}

export default preview
