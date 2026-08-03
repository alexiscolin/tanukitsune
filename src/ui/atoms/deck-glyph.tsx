'use client'

// Drawn rather than set. What the strip is made of is a glyph that has receded, and it recedes
// by being set at a third of the muted ink, which is a ratio no text may carry. Drawn, the
// character is a shape rather than a word, which is what it always was here: the strip is
// hidden from the accessibility tree because it repeats the heading.
//
// One em of advance per character, which is what a full-width character takes. Kana are
// narrower and the anchor centres what is left over, so a word sits in its own space rather
// than in its neighbour's.
export function DeckGlyph({ characters, active }: { characters: string; active: boolean }) {
  const advance = Math.max(characters.length, 1)

  return (
    <svg
      viewBox={`0 0 ${advance * 16} 16`}
      style={{ width: `${advance}rem` }}
      className={`ease-out-soft h-4 shrink-0 transition duration-500 ${
        active
          ? 'font-medium text-[var(--color-ink)]'
          : 'blur-hair font-light text-[var(--color-ink-muted)]/35'
      }`}
    >
      <text
        lang="ja"
        x={advance * 8}
        y="8"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fill="currentColor"
      >
        {characters}
      </text>
    </svg>
  )
}
