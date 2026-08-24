import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages'

// The shape every corpus request takes, held once because four prompts ask the same way and a fifth
// copying a third is how the ceiling or the cache window comes to differ between two of them for no
// reason anybody wrote down. What differs between them is the prefix, the format and what is asked;
// everything else is the same decision made once.
//
// The ceiling covers thinking and the answer together, and this model thinks unless told not to, so a
// ceiling sized for the answer alone comes back truncated. Room for both, an unused one costing
// nothing. Thinking is stated rather than left to the default, because the default differs between
// models in this family and the difference is that truncation.
//
// An hour of cache rather than the default five minutes: a batch routinely runs longer than that, and a
// prefix expiring mid-run is written again and read by nothing.
export function corpusRequest(
  prefix: string,
  format: MessageCreateParamsNonStreaming['output_config'],
  asks: string,
): MessageCreateParamsNonStreaming {
  return {
    model: 'claude-opus-5',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    output_config: format,
    messages: [{ role: 'user', content: asks }],
  }
}
