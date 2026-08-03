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

      // A screen carries its own shell, and a second one around it would measure a rhythm the
      // product never has, so a story that declares itself full bleed gets nothing.
      if (context.parameters.layout === 'fullscreen') return <Story />

      // Everything else is a piece rendered alone, which needs a ground to be seen against and
      // a height to resolve against: a card is full height inside its deck, and a box with no
      // definite height of its own gives it nothing to be full of. The ground is here rather
      // than in a story because a story that draws its own surface is a story writing markup,
      // which docs/decisions/0009-storybook-as-the-review-surface.md refuses.
      return (
        <div className="h-screen-safe flex flex-col gap-6 bg-[var(--color-canvas)] p-6">
          <Story />
        </div>
      )
    },
  ],
}

export default preview
