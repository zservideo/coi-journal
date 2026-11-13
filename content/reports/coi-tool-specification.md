---
{
  "title": "What to require from any COI tool: a vendor-neutral specification",
  "short": "What to require from any COI tool",
  "question": "What should a general contractor look for in COI tracking software, and which checks matter most when choosing one?",
  "description": "A COI Journal white paper with a vendor-neutral specification for COI tracking tools: what to require, how to test it, and the questions to ask in a demo.",
  "dek": "We don't rank software. But we can tell you what to ask for. This is a specification any COI tool, service or spreadsheet process can be measured against, with a way to test each line yourself.",
  "kind": "White paper",
  "number": "R-13",
  "date": "2026-11-13T00:00:00-05:00",
  "byline": "The editors",
  "docket": "COIJ-26-0014",
  "about": ["certificate-of-insurance", "additional-insured", "completed-operations", "per-project-aggregate", "primary-and-noncontributory", "waiver-of-subrogation", "notice-of-cancellation"],
  "takeaways": [
    "The line that separates tools is whether they review endorsements against each project's requirements, or only store certificates and dates.",
    "Test every claim with your own documents: one real project's requirements and a handful of real certificates and endorsements.",
    "Ask how each pass or fail is explained, who handles exceptions, and how the broker gets the fix request.",
    "COI Journal doesn't rank or review vendors, including our publisher. This specification is meant to be used on all of them."
  ],
  "method": "This is a vendor-neutral specification. It names no products and makes no claims about any. COI Journal is published by Forsured, which sells COI compliance software; this paper is written so it can be applied to Forsured's product as easily as to any other. General information, not legal or insurance advice.",
  "sources": [
    { "title": "ACORD 25 Certificate of Liability Insurance (2025/12), as posted by the New York State Department of Financial Services", "url": "https://www.dfs.ny.gov/system/files/documents/2025/12/acord-25-2025-12-liability.pdf", "publisher": "ACORD / NY DFS" }
  ]
}
---
## How to use this

Take one real project. Write down its insurance requirements. Pull three to five real certificates and the endorsements behind them, including at least one you know has a gap. Then run every tool, service or process you're considering against the same packet, line by line, using the specification below.

## The specification

### Requirements

1. Holds different requirements per project, and per trade tier within a project.
2. Captures coverages, limits, endorsements, durations, named additional insureds, carrier rating, deductible caps and notice rules.
3. Records where each requirement came from in the contract.

### Review

4. Reads the certificate and extracts carriers, policy numbers, dates, limits and names.
5. Reads the endorsements, not just the certificate's checkboxes. See [additional insured](/dictionary/additional-insured/).
6. Checks ongoing and completed operations separately. See [completed operations](/dictionary/completed-operations/).
7. Checks primary and noncontributory, waivers of subrogation and per project aggregates as separate requirements.
8. Flags a missing document as a failure, not a pass.
9. Explains each failure: the requirement, what was found, and the document that would fix it.

### Renewals and lapses

10. Tracks expiration dates at the policy level, across every project a trade works on.
11. Requests renewals, with endorsements, before expiration.
12. Treats a policy with no renewal on its expiration date as lapsed. See [notice of cancellation](/dictionary/notice-of-cancellation/).

### Fixing gaps

13. Sends deficiency requests to the trade's broker with the requirement quoted.
14. Lets the broker respond with documents, and re-checks what comes back.
15. Keeps an audit trail of who checked what, and when.

### Fit and governance

16. Works with the project tools you already use.
17. Says clearly what is automated and what a person reviews.
18. Says how its accuracy is tested and how errors are caught. See [Can AI review a COI?](/reports/can-ai-review-a-coi/).
19. Says where your documents are stored and who can see them.
20. Publishes its pricing, or quotes it in writing.

## Demo questions

- Show me a certificate with a checked additional insured box and no endorsement. What happens?
- Show me how you check completed operations separately from ongoing operations.
- Show me a project with different limits than my standard subcontract.
- Show me what the broker receives when something fails.
- Show me the audit trail for one certificate.

## Scoring

Mark each of the 20 lines pass, partial or fail on your packet, not on the slide deck. Weight lines 5 to 9 most heavily: they decide whether the tool finds the gaps that cost money.
