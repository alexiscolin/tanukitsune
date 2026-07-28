# AI engineering

**What this is.** How the model-facing parts of the product are built, measured and paid for: models, prompts, structured output, evals, caching, observability, error analysis.

The product decisions about where a model is used at all are in [`framing.md`](framing.md); this is the layer below.

## Model selection, per surface

Not one model. Four surfaces with different economics.

**Corpus generation.** The strongest model available, and no cost optimisation. It runs a handful of
times, the output is permanent and shared by every user, and a mediocre mnemonic is a defect that
ships to everyone forever. This is the one place where quality dominates cost outright.

**The judge.** Cheap and fast tier, escalating to a stronger one only on low confidence or unparseable
output. The cascade in front of it matters far more than which model sits behind it: most traffic
never reaches a model at all. The judge must also come from a **different model family than the corpus
generator**, because a model scores its own family's output several points higher on equivalent
content.

**The tutor.** Middle tier, tuned by reasoning effort rather than by swapping models.

**Constrained generation.** Cheapest tier. The deterministic validator is the quality floor, so a
weaker model means more retries, not worse output. Measure the retry rate against model cost and pick
the actual minimum.

Every model is pinned to a dated snapshot, never a floating alias, and the identifier is stored on
every row it produced.

**Escalation rate is a live cost variable, not a constant.** Alert on it. A prompt change that moves
escalation from one in ten to four in ten quietly quadruples the bill.

## Prompts

**In code, in git, as typed modules with a version constant.** Not in a runtime registry.

A registry buys version history, rollback, audit and non-engineer editing. Git provides all of those
except the last two, and neither applies to a solo repository where a deploy takes ninety seconds. A
runtime registry would add a cold-start fetch, a network dependency and a failure mode where
production behaviour is not reproducible from a commit.

What the registry is genuinely right about is kept: the version constant is stamped on every trace,
forms part of the judge cache key so a bump invalidates cached verdicts, and is referenced by the eval
suite. Version history, rollback and eval linkage, with no runtime dependency.

**Few-shot examples: fewer than reflex suggests.** Examples still help for format and edge cases, but
strong models constrain themselves to the examples given rather than generalising from them. Prefer
one or two examples covering the shape, plus explicit rules, over five examples covering the space.
For the corpus this matters concretely: too many sample mnemonics and every generated one starts to
sound like the samples.

**Prohibition lists are counterproductive.** Say what to do. A long list of what not to do dilutes the
instruction that matters, and current models follow positive instruction better than negative.

## Structured output

`generateObject` with a Zod schema, using the provider's native structured-output path, with retries
configured explicitly rather than left at the default.

**Schemas stay flat and shallow.** Deep nesting is the most common cause of structured-output failure
across providers, and recursive schemas are unsupported by some. Numeric and string constraints such
as minimum and maximum length are dropped before reaching the model, so they are validation on the way
back, not instruction on the way out.

**Output parsing is not hand-written any more**, but a parse failure is a first-class outcome: typed,
logged, counted, never silently coerced to null. Always `.strict()` on the schema so unexpected keys
fail rather than pass.

**A refusal is not an exception.** Newer models return a safety decline as a successful response with
a distinct stop reason, so code that reads the first content block unconditionally breaks. Branch on
the stop reason before touching content. This is not hypothetical here: a vocabulary corpus contains
anatomy, violence and profanity entries that trip classifiers.

Retries are layered. The provider SDK handles transport failures. A bounded repair loop, at most two
attempts, handles schema failures by feeding the validation error back as context. Beyond that it
fails closed with a typed error. For the judge specifically, escalating to a stronger model on low
confidence is cheaper than showing a learner a wrong verdict.

## Tool use

**The judge has no tools, and that is a security property rather than an omission.** No tools plus a
closed enum output means an injection into it cannot exfiltrate or act. This is the strongest security
claim in the product and it costs nothing to hold.

Tools appear in two places, both later. The tutor gets a small, tightly scoped set for reading the
learner's own state, never for writing. The MCP server is entirely tools, and the design rule there is
that four good ones beat twenty: a tool that completes a task beats a tool that wraps an endpoint and
forces the model to orchestrate.

## Retrieval

**One genuine use: the tutor**, answering open-ended questions over a grammar corpus, where retrieval
grounds the answer and prevents invention.

Everything else that looks like retrieval is a query. Fetching a learner's known vocabulary to
constrain a generated sentence is a `SELECT`, not semantic search, and calling it retrieval inflates
the description without changing the code. The hard part there is not finding the vocabulary, it is
**verifying the output**: the generated sentence is tokenised and every token checked against the
known set, with a bounded regeneration loop on failure. That is stronger than trusting the model to
obey a constraint, and the retry-count distribution is a free quality metric.

## Evals

Tiered and hybrid. Deterministic assertions wherever a property is checkable, model-graded only where
judgement is genuinely required, human review for the small fraction either layer flags.

**Datasets live in git next to the prompts.** A prompt change and a dataset change in the same commit
is a review flag, because it is how a suite gets fitted to a prompt rather than measuring it.

**Start at five to ten cases, not five hundred.** A golden set grows from production failures: every
bug report becomes a case. That is the single highest-leverage habit here, and it is also why the
self-grade override is captured from v0.1, since each override is a labelled human disagreement drawn
from exactly the distribution the calibration set struggles to sample by hand.

**Stratify toward the hard middle.** A set that is ninety percent obvious-pass and obvious-fail will
report ninety-five percent accuracy and teach nothing. Oversample typos, near synonyms, partial
answers, missing accents, and answers in the wrong language.

**Two sets, not one.** A stratified diagnostic set for finding failure modes, and a representative set
for the headline number and the CI threshold. They cannot be the same set: stratifying engineers away
the class imbalance that the representative number needs to reflect.

**The corpus is acceptance sampling, not regression.** It runs once, so the question is ship or
regenerate: sample a few hundred items stratified by frequency, judge them, hand-review the flagged
tail.

**In CI:** full suite nightly and on the main branch, a fast subset on pull requests, verdicts cached
by prompt version. Fail the build on a drop below threshold, and post the before-and-after difference.
Gate on the **end-to-end false-reject rate**, not on judge agreement alone: a judge that agrees with
humans behind a fuzzy matcher that wrongly rejects three percent of answers is still a bad product.

**Track dataset growth alongside the score.** A suite whose score only ever rises is a suite being
overfitted.

## Judge calibration

The part that separates a measured claim from a demo.

150 to 250 hand-labelled cases. **Humans label first**, using the exact rubric text the judge will
see, so rubric ambiguity surfaces as disagreement between humans rather than as a mysterious low
score later. Labelling is blind to the judge's output, and labels are frozen before any prompt tuning.

Then agreement between the judge and the human majority, with a bar at 0.70 on Cohen's kappa. Because
most learner answers are correct, class imbalance depresses kappa even at high raw agreement, so
Gwet's AC1 is reported alongside with the reason stated.

**False accept and false reject are measured separately.** Never punish a correct answer is a product
rule, so the two errors are not equivalent and a single accuracy figure hides the one that matters.

At this sample size the confidence interval on kappa is roughly a tenth, so a hard threshold at 0.70
will pass and fail on sampling noise. Report the interval and gate on its lower bound.

Review the disagreements and publish how often the judge was right and the humans wrong. That number
is the honest ceiling on measured accuracy, and publishing it is the most credible thing in the eval
story.

## Caching and cost

Three mechanisms, not one.

**Exact-match cache, the largest win.** Judge verdicts are globally cacheable because learners make the
same mistakes: the key is the normalised answer, the item, the judge model, the prompt version and the
corpus version. Normalisation raises the hit rate materially. Raw user text is never stored, only its
normalised form.

**Provider prompt caching**, for the batch job and the tutor. Prefix-matched, so any byte change
anywhere in the prefix invalidates everything after it: no timestamps, no unsorted JSON, no varying
tool list in the cached prefix. The minimum cacheable prefix is model-dependent and does not fail
loudly when missed, so verify with the cache-read token count rather than assuming. It stacks with
batch pricing.

**Semantic caching is refused.** Two words a hair apart in embedding space can have opposite verdicts:
the masculine and feminine forms of the same noun are around 0.95 cosine similarity and grade
differently. Trading accuracy for cost is reasonable for a support chatbot and unacceptable when the
cached value *is* the correctness judgement.

**Batch for the corpus**, which halves the cost and stacks with a cached shared prefix across the whole
run. The job is idempotent, resumable, keyed by item, written incrementally, and results are keyed by
identifier rather than by position because they arrive out of order.

**Token accounting has one trap worth knowing.** The input token count reports only the uncached
remainder. Total prompt size is that plus cache creation plus cache read, and a dashboard reading the
first alone under-reports badly once caching is on.

Cost is computed server-side from a versioned price table in code, never read from a vendor dashboard.
Two numbers are tracked: cost per active learner per day, and marginal cost per graded answer. The
second determines whether the product is viable, and it should trend toward zero as the shared cache
warms.

## Observability

Emit OpenTelemetry spans from the SDK, into a self-hostable collector.

**Do not build dashboards or alerts on the generative-AI attribute names.** That convention set is not
stable, has no pinnable release, and has already renamed several attributes across versions. Normalise
into an internal schema at ingest; the mapping layer is small and saves a migration.

Every span carries the user or a hashed pseudonym, the feature, the prompt version, the model
identifier, and the full token usage including both cache fields.

Alert on: escalation rate to the model tier, parse-failure rate, refusal rate, retry-count
distribution on constrained generation, p95 latency on the judge, and cache hit rate. Those six are
also the drift monitor: the judge is measured once at calibration and would otherwise never be
measured again.

## Error analysis

Failures are outcomes with counts, not exceptions to swallow.

Four categories, each logged with its input and its prompt version: schema parse failure, refusal,
retry exhaustion, and judge-verdict override by the user. The fourth is the most valuable, because it
is a human telling you the system was wrong, for free, continuously.

The loop is: every logged failure is triaged into the eval dataset or dismissed with a reason. A
failure that is neither is a failure that will recur.

Guardrails are structural rather than declarative. Prompt injection is not a solved problem, and the
defensible posture is a constrained output space, no tools where untrusted text flows, and
deterministic validation of anything a model produces. Model output is never rendered as markup. User
answers are length-capped and rate-limited before they reach a prompt, and are passed inside explicit
delimiters as data to evaluate rather than as instruction.
