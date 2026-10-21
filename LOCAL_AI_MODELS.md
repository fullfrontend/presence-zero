# Local model roles and evaluation

[README](README.md) · [Ollama setup and private profiles](guides/LOCAL_AI.md)

## Configured roles

PresenceZero separates bounded extraction from website analysis. The committed
[environment example](.env.example) selects the following models; users can replace
either role independently through Settings or environment variables.

| Role | Variable | Example model |
|---|---|---|
| Exact excerpt selection and listing-only summaries | `OLLAMA_LIGHT_MODEL` | `qwen3.5:4b-q4_K_M` |
| Verified website audit, recommendations and brief | `OLLAMA_MODEL` | `qwen3.5:9b-q4_K_M` |

These choices were introduced on 19 October 2026 for French-language business
analysis and structured JSON. They are workload choices, not a claim of universal
model superiority. The heavy role requires an explicitly configured model;
setting a model name does not enable AI or download it.

Both roles use Ollama structured output with thinking disabled by default. They
have separate time, context and output budgets. `AI_AUDIT_PREPARE_EVIDENCE=false`
disables only excerpt preparation; the global `AI_AUDIT_ENABLED` switch controls
all application AI calls. Existing reports remain visible when AI is disabled.

## Select models for your machine

Start with the example pair, then evaluate alternatives using your hardware,
report language and representative evidence. The light role needs reliable exact
quotation and bounded output; the heavy role needs grounded synthesis across pages.
A larger model is not automatically better at either task. Neither model performs
browser rendering or visual website assessment in this integration.

Check the [Ollama model catalog](https://ollama.com/library/qwen3.5/tags) for the
available tags and their current download requirements. Memory use also depends
on context length and simultaneous loaded models. Record the resolved model digest,
quantization and inference settings for reproducible comparisons; tags can change.

## Automated tests

`npm test` uses synthetic fixtures and injected network/time dependencies. It covers
malformed JSON, unsupported quotations, invented references, incorrect identity,
blocked crawling, role dispatch, evidence-preparation fallback, independent budgets,
profile loading and evidence-based scoring. It never invokes a live model.

Passing these tests verifies application behavior, not model accuracy.

## Explicit live evaluation

With Ollama running and both models downloaded, run:

```bash
npm run ai:evaluate
```

This command deliberately invokes Ollama even if application AI is disabled. It
loads `.env` and the process environment, not saved Settings overrides. Configure
the model names, server address and private profile there before running it.

The script supplies synthetic listing and HTML evidence, runs the light and heavy
roles, validates reports and prints timing/token metadata. It does not crawl real
businesses, download models or publish generated claims. A pass demonstrates protocol
and grounding checks on those fixtures; it is not an accuracy benchmark.

Historical development checks caught joined-excerpt quotations and references to
missing listing fields. They also produced overstated SEO interpretations despite
valid citations. Quote validation proves that text was present in the evidence,
not that the interpretation or commercial recommendation is correct. Review reports
against their evidence before using them to qualify a prospect.
