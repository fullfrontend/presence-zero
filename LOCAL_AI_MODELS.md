# Local model selection — 19 October 2026

This selection targets French-language business evidence and strict JSON on a
single operator's machine, with modest latency and memory use. It is a task-specific
engineering choice, not a claim that one model is universally best. The model tags
are explicit quantizations; they are configurable independently and Ollama can
update their underlying manifests. Record local model digests for reproducible comparisons.

| Role | Default | Rationale |
| --- | --- | --- |
| Excerpt selection and listing summaries | `qwen3.5:4b-q4_K_M` | Small download (~3.3 GB), strong published instruction-following and multilingual results; exact-copy output is independently checked. |
| Verified website audit, recommendations and brief | `qwen3.5:9b-q4_K_M` | More capacity for synthesis and competing evidence (~6.6 GB); still modest for a 48 GB host. Slightly above the initially discussed 7–8B class. |

Both use Ollama structured outputs and non-thinking mode by default. Small,
bounded audits do not need the models' maximum context. Published benchmark results
are usually for different inference settings and full models, so they do not prove
accuracy of these quantizations on PresenceZero.

## Alternatives considered

- [Qwen3.5 model card](https://huggingface.co/Qwen/Qwen3.5-9B): the publisher reports
  IFEval 89.8 (4B) / 91.5 (9B), and stronger long-context results for 9B. These favor
  the light/heavy split but are not website-audit benchmarks.
- [Ministral 3](https://ollama.com/library/ministral-3): a good alternative for French,
  JSON and instruction following, with 3B/8B/14B variants. The 8B package is about
  6 GB; it can replace the heavy model without application changes. It was reviewed
  from documentation, not benchmarked locally in this implementation.
- [Gemma 4](https://ollama.com/library/gemma4): the E4B package is about 6.6 GB or
  more, making it less attractive for the light role than the selected 4B package.
  Larger 26B/31B variants offer a higher-capacity option but exceed the initial
  small-model profile and increase the download/memory budget. Not benchmarked here.
- [Qwen2.5 7B](https://ollama.com/library/qwen2.5:7b): multilingual and JSON-capable,
  initially downloaded as a baseline, but not selected merely because it was
  already installed. The newer Qwen3.5 pair is the selected default.

Tag availability and package sizes were checked in the official
[Ollama catalog](https://ollama.com/library/qwen3.5/tags). Exact sizes depend on the
quantization and catalog revision. Review these choices as models and hardware evolve.

## Validation

`npm test` uses fixtures and injected network/time dependencies. It tests malformed
JSON, unsupported quotes, invented references, wrong identity, blocked crawling,
light/heavy dispatch, safe preparation fallback, independent budgets, profile loading,
and unchanged presence scoring. It never invokes a live model.

`npm run ai:evaluate` is an explicit live smoke check. It sends synthetic listing
and HTML evidence to the configured local Ollama server, validates the actual
light-model selection/profile and heavy-model report, and prints timing/token and
validation metadata. It does not crawl real businesses, publish generated claims,
or download models. A pass validates the protocol and grounding on those examples;
it is not a statistically meaningful accuracy benchmark or proof of optimality.

On the development machine, the final smoke run completed all three stages:
excerpt selection 3.6 s / 145 output tokens, website audit 18.5 s / 554 tokens,
listing summary 8.0 s / 356 tokens. These are one-run observations, not latency
guarantees. Model loading, hardware and evidence size change the timings.

Earlier runs exposed joined-excerpt quotations and citations of listing fields
missing from the evidence snapshot. They were rejected instead of receiving a
score. Excerpts now remain separate structured values and the listing snapshot
includes the supplied website field. Exact citation checks cannot establish the
truth of a model's interpretation: the smoke also produced overstated SEO claims
despite correct citations. Treat all scores and briefs as reviewable suggestions,
not technical diagnoses or verified commercial needs.
