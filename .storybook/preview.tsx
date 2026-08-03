import type { Preview } from '@storybook/nextjs-vite'

import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    // The catalogue owns every inset, so the preview itself lays none. Storybook's default
    // pads the body, which would sit outside the ground below and add to it: a box asked to
    // be exactly the viewport tall then overflows the page it is centred in, and a screen
    // meant to reach the edges stops short of it by a rhythm nothing in the product has.
    layout: 'fullscreen',
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
      if (context.parameters['fullBleed'] === true) return <Story />

      // Everything else is a piece rendered alone, which needs a ground to be seen against and
      // a height to resolve against: a card is full height inside its deck, and a box with no
      // definite height of its own gives it nothing to be full of. The gutter is the shell's,
      // so a piece is as wide here as it is in the product. The ground is here rather than in
      // a story because a story that draws its own surface is a story writing markup, which
      // docs/decisions/0009-storybook-as-the-review-surface.md refuses.
      return (
        // Exactly the viewport tall and never a scroller: a piece that runs longer overflows
        // onto the page, which scrolls without owing anyone a tab stop, where a box that
        // scrolls owes one and a story is not the place to hand it out.
        <div className="h-screen-safe flex flex-col gap-6 bg-[var(--color-canvas)] px-6 py-6 sm:px-8">
          <Story />
        </div>
      )
    },
  ],
}

export default preview
