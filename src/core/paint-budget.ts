// The budget v0.1 sets on the item card: a wrong answer shows it in under a tenth of a second at the
// ninety-fifth percentile, measured from the verdict being decided to the card being painted. A
// number nobody measures is a number nobody keeps.
//
// The names are here rather than in the screen because the end-to-end suite reads them from outside
// the bundle, and a string spelled twice is a measurement that silently stops existing. What lays
// them is ui/primitives/paint-budget.ts, which is where the browser is.
export const VERDICT_DECIDED = 'verdict-decided'
export const CARD_PAINTED = 'card-painted'
export const PAINT_SPAN = 'card-paint'
export const PAINT_BUDGET = 100
