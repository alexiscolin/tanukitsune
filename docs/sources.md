# Sources

**What this is.** Every load-bearing claim in this documentation, with where it comes from. A claim without an entry here does not belong in an argument.

Every load-bearing claim in this documentation, with where it comes from. Verified July 2026.

The rule: a number that carries an argument has its source in the same paragraph as the claim, or it
gets deleted. This file exists so those links stay checkable in one place, and so that a claim whose
source later moves can be found and fixed rather than quietly rotting.

## The product thesis

**FSRS is opt-in in Anki, not the default.** Shipped in
[Anki 23.10](https://github.com/ankitects/anki/releases/tag/23.10), October 2023.
[ankitects/anki#3616 "Make FSRS the default?"](https://github.com/ankitects/anki/issues/3616), opened
December 2024, is still open.

**The "20 to 30 percent fewer reviews" figure is a simulation, not a measurement.** The claim appears
in the [ABC of FSRS wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS),
amended in February 2026 to state that it is based on simulation results. The
[public benchmark](https://github.com/open-spaced-repetition/srs-benchmark) measures prediction
accuracy only, never review counts.

**The benchmark corpus** is roughly 350M reviews from 10,000 users, excluding same-day reviews:
[srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark).

**FSRS generalisation caveat**, relevant when we measure it ourselves:
[srs-benchmark#166](https://github.com/open-spaced-repetition/srs-benchmark/issues/166) reports that
FSRS does not generalise well between different retention levels, and WaniKani's fixed ladder produces
a distribution unlike Anki's.

## WaniKani

**No review history since April 2023.**
[API reference](https://docs.api.wanikani.com/20170710/): review data is no longer persisted, and the
returned review carries an id that is always zero.
[Community announcement](https://community.wanikani.com/t/61617).

**Rate limit is sixty requests per minute per token**, confirmed as per-token rather than per-IP by a
WaniKani engineer: [community.wanikani.com/t/32851](https://community.wanikani.com/t/32851).

**Subscription gating is the client's job.** Free accounts are granted three levels; reads are not
server-filtered while writes are rejected above the granted level.
[API reference](https://docs.api.wanikani.com/20170710/).

**No commercial use.** The [API reference](https://docs.api.wanikani.com/20170710/) states you cannot
use the content to build anything for profit. The
[terms of service](https://www.wanikani.com/terms) prohibit exploiting any portion of the service
without express written permission. A Tofugu staff member confirmed in February 2026 that approval
requires the app to be completely free:
[community.wanikani.com/t/73627](https://community.wanikani.com/t/73627).

## Platform constraints

**Async Server Components cannot be unit tested.** Official position, still current in the Next.js 16
docs: [Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest) recommends end-to-end
tests for async components.

**Safari deletes an origin's storage after seven days without interaction**, all at once. On Safari and
on Chromium, `navigator.storage.persist()` is auto-decided from engagement heuristics with no user
prompt; Firefox shows a permission prompt instead, so the returned boolean is read rather than assumed
on every engine:
[MDN, storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

**Web push reaches installed web apps on iOS from 16.4**, and the notification mirrors to a paired
Apple Watch. What no web API provides is answering from the watch:
[WebKit, web push for web apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

**The Web Speech API is available in Safari on iOS from 14.5**:
[caniuse, speech recognition](https://caniuse.com/speech-recognition).

## Regulation

**EU AI Act transparency obligations apply from 2 August 2026**, and were not deferred by the Digital
Omnibus, unlike the high-risk obligations.
[Article 50](https://artificialintelligenceact.eu/article/50/),
[European Commission regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai).

**AI literacy obligations have applied since 2 February 2025**:
[Article 4](https://artificialintelligenceact.eu/article/4/).

**LLM deployer is typically the controller under GDPR**:
[EDPB, AI Privacy Risks and Mitigations in LLMs](https://www.edpb.europa.eu/system/files/2025-04/ai-privacy-risks-and-mitigations-in-llms.pdf).

**European Accessibility Act has applied since 28 June 2025** and covers e-commerce services,
harmonised through EN 301 549:
[European Commission](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en).

**WaniKani's subject content is copyrighted, and a third-party client may render it on two conditions**:
nothing built on it may be for profit, and the limits a subscription puts in place must be respected,
read from `max_level_granted` and the subscription's active state on the `user` endpoint. The free tier
grants three levels and a paid one sixty:
[WaniKani API reference](https://docs.api.wanikani.com/20170710/), read 31 July 2026. What the terms
address is rendering to the account that holds it; producing a derived layer from that content is a
question they do not answer, which is why the corpus is generated from the item rather than from them.

**A time limit satisfies WCAG 2.2.1 when any one of turn off, adjust or extend holds**, which is what
makes a limit the reader switches on conformant without resting on the essential-activity exception:
[Understanding SC 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).
The criterion is Level A, so it is the floor rather than a target:
[How to Meet WCAG, 2.2.1](https://www.w3.org/WAI/WCAG22/quickref/#timing-adjustable).

## Judging and evaluation

**Self-preference bias exists and is measurable**, which is why the judge comes from a different model
family than the generator: [arXiv 2410.21819](https://arxiv.org/pdf/2410.21819). The paper defines the
effect as a difference in conditional probabilities and publishes no effect size in points, so no
figure is quoted from it. The setting also differs from ours: that literature measures judges grading
model-authored text, while this judge grades a learner's answer against a model-authored reference. The
design rule rests on the direction of the effect, which transfers, not on its size, which does not.

**Position bias affects pointwise rubric grading**, not only pairwise comparison, which is a 2026
finding contradicting earlier assumptions: [arXiv 2602.02219](https://arxiv.org/pdf/2602.02219).

**Prompt injection is not solved** within current architectures, acknowledged across providers.
[OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/),
[The Attacker Moves Second](https://arxiv.org/pdf/2510.09023).

**Enforcing security outside the model works where prompting does not**:
[CaMeL](https://css.csail.mit.edu/6.5660/2026/readings/camel.pdf).

## Tooling

**TypeScript 7.0 shipped without a public compiler API**:
[announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
[typescript-eslint declines TS 7 support](https://github.com/typescript-eslint/typescript-eslint/issues/12518)
until the API exists.

**ESLint 10 deleted eslintrc; ESLint 9 support ends 6 August 2026**:
[version support](https://eslint.org/version-support),
[v10 release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/).

**Next.js 15 reaches end of life 21 October 2026**:
[vercel/next.js#85289](https://github.com/vercel/next.js/discussions/85289).

**knip is the only maintained dead-code tool.** `ts-prune` and `tsr` are both archived and both point
at knip in their archive notices. [knip.dev](https://knip.dev/).

## Method and measurement

**Division of labour and the expertise finding**: users take roughly 70 percent of planning decisions,
agents roughly 80 percent of execution decisions, and domain expertise rather than coding proficiency
predicts success.
[Anthropic, how Claude Code is used in practice](https://www.anthropic.com/research/claude-code-expertise).

**Claude Code best practices**, including the verification principle and the two-corrections rule:
[code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices).

**Throughput and instability rise together with AI adoption**:
[DORA 2025](https://dora.dev/dora-report-2025/).

**The 19 percent slowdown result stands, and its authors are changing the experiment design.** The
original study reports a 19 percent slowdown with a confidence interval from +2 to +39 percent. The
February 2026 follow-up does not retire it: it announces a design change, and the roughly 18 percent
speedup it mentions applies only to returning participants and is described there as very weak
evidence.
[METR original](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/),
[METR update](https://metr.org/blog/2026-02-24-uplift-update/).

**Security pass rates have not improved**: 45 percent of AI-generated samples introduce an OWASP Top
10 vulnerability, unchanged as of March 2026:
[Veracode](https://www.veracode.com/blog/spring-2026-genai-code-security/).

**Duplication and refactoring figures**: copy-pasted lines rose from 8.3 to 12.3 percent of changed
lines and moved lines fell from 25 percent to under 10, between 2021 and 2024.
[GitClear](https://www.gitclear.com/ai_assistant_code_quality_2025_research). Caveats that travel with
it: the causal attribution to AI is not established by the data, moved lines are a proxy rather than a
measurement, the vendor sells analytics, and the data ends before agentic coding. A
[14-project longitudinal study](https://rkochanowski.com/article/analysis-code-duplication/) found no
trend at all over 2021 to 2026.

**Adversarial review needs a leash**, because a reviewer prompted to find gaps reports some even when
the work is sound, which produces unnecessary abstraction and defensive code:
[Claude Code best practices](https://code.claude.com/docs/en/best-practices).

**AGENTS.md is stewarded by the Agentic AI Foundation under the Linux Foundation**, and Claude Code
reads `CLAUDE.md` rather than `AGENTS.md`, hence the one-line import:
[agents.md](https://agents.md/), [memory docs](https://code.claude.com/docs/en/memory#agents-md).

## Claims deliberately not made

Recorded so they do not creep back in.

- Any specific speed multiplier for one linter or test runner over another. That query space is
  dominated by content farms recycling invented numbers, and none survived checking.
- Hiring statistics about AI and interviews. Same problem, no methodology found behind any of them.
- A2A production adoption depth. The organisation counts are vendor-published, and "supported by" is
  not "used in production by".
