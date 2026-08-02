import type { Preview } from '@storybook/nextjs-vite'

import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    // Widths a layout is decided at, rather than device names, which age and multiply. The
    // three named ones are Tailwind's own defaults, so they are what an sm:, lg: or xl:
    // prefix resolves to the day one is written, and the fourth is the narrow phone below
    // the smallest of them.
    viewport: {
      options: {
        narrow: { name: 'Narrow, 360', styles: { width: '360px', height: '780px' }, type: 'mobile' },
        sm: { name: 'sm, 640', styles: { width: '640px', height: '900px' }, type: 'mobile' },
        lg: { name: 'lg, 1024', styles: { width: '1024px', height: '768px' }, type: 'desktop' },
        xl: { name: 'xl, 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  // Narrow rather than the preview panel's own width: a screen meant to fill the viewport
  // fails at its narrowest first, so that is the one worth landing on without asking.
  initialGlobals: { theme: 'light', viewport: { value: 'narrow' } },
  decorators: [
    (Story, context) => {
      // The colour scheme beside the attribute, as src/app/[locale]/layout.tsx sets it: it
      // is what stops controls, scrollbars and the page background from rendering light
      // under a dark theme.
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme

      // Not wrapped: every screen carries its own shell, and a second one around it would
      // measure a rhythm the product never has.
      return <Story />
    },
  ],
}

export default preview
