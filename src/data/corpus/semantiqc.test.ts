import { describe, expect, it } from 'vitest'

import { parseImagery } from './semantiqc'

// One tab-separated row per word, rated by how strongly it is seen, from 0 to 100. The spread and the
// raters are stated beside the mean and the corpus takes none of them.
const NORMS = [
  'word_name\tmean_word\tSD_word\tmin_word\tmax_word\tnumber_of_raters\tmean_response_time\tsd_response_time',
  'abandon\t47.960\t34.401\t0\t100\t26\t5.081\t5.164',
  'canal\t88.120\t12.900\t20\t100\t31\t3.400\t2.100',
  'gré\t12.500\t20.100\t0\t70\t28\t6.200\t4.900',
].join('\n')

describe('parseImagery', () => {
  it('rates a word by how well it can be seen, on the scale the norms use', () => {
    const rated = parseImagery(NORMS)

    expect(rated.get('canal')).toBe(88.12)
    expect(rated.get('gré')).toBe(12.5)
  })

  // A word nothing rated is absent rather than rated low, which is a different claim: the limits say
  // what an unrated word is worth, and a zero would say the raters saw nothing in it.
  it('rates no word the norms do not state', () => {
    expect(parseImagery(NORMS).has('couteau')).toBe(false)
  })
})
