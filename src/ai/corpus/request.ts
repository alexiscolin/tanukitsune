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
// A prompt asking a question that is a search rather than a lookup says so and raises it: half of one
// bounded run of the anchor prompt came back cut off at four thousand, the model having read its way
// through a language before answering. It is stated by the prompt that needs it rather than raised for
// all, since a ceiling is part of what a request was made under and moving it moves every version.
//
// An hour of cache rather than the default five minutes: a batch routinely runs longer than that, and a
// prefix expiring mid-run is written again and read by nothing.
// The one model every step of the run reaches, named here so a row can record what wrote it without
// each command deciding that for itself.
export const CORPUS_MODEL = 'claude-opus-5'

export function corpusRequest(
  prefix: string,
  format: NonNullable<MessageCreateParamsNonStreaming['output_config']>['format'],
  asks: string,
  ceiling = 4096,
): MessageCreateParamsNonStreaming {
  return {
    model: CORPUS_MODEL,
    max_tokens: ceiling,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    output_config: { format },
    messages: [{ role: 'user', content: asks }],
  }
}
