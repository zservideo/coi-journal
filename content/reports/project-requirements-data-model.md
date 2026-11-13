---
{
  "title": "A data model for project requirements",
  "short": "A data model for requirements",
  "question": "How should a general contractor structure project insurance requirements as data so certificates can be checked against them consistently, by people or software?",
  "description": "A COI Journal white paper proposing a simple data model for project insurance requirements: projects, tiers, lines, endorsements, parties and the source clause.",
  "dek": "Requirements that live in a PDF get read differently by every reviewer. Requirements stored as data get checked the same way every time, by a person, a spreadsheet, software or an AI agent.",
  "kind": "White paper",
  "number": "R-39",
  "date": "2026-11-23T06:30:00-05:00",
  "byline": "The editors",
  "docket": "COIJ-26-0040",
  "about": [
    "certificate-of-insurance",
    "additional-insured",
    "per-project-aggregate",
    "completed-operations"
  ],
  "takeaways": [
    "Store requirements as structured records: project, trade tier, coverage line, limit, endorsements, parties and duration.",
    "Every line carries its source clause, so any reviewer can answer 'says who?'",
    "Separate what the contract requires from what a trade has shown. Keep them as two records joined by the check.",
    "The same model works for a spreadsheet, a COI platform or an AI agent. The structure matters more than the tool."
  ],
  "method": "A proposed structure from the editors, based on the public owner requirements and ISO and NCCI forms reviewed in our earlier reports. It's a starting point, not a standard. General information, not legal or insurance advice.",
  "sources": [
    {
      "title": "One set of rules per project",
      "url": "https://coijournal.com/reports/per-project-requirements-and-renewals/",
      "publisher": "COI Journal"
    },
    {
      "title": "Public owner insurance requirements compared",
      "url": "https://coijournal.com/reports/public-owner-requirements-compared/",
      "publisher": "COI Journal"
    },
    {
      "title": "COI review skill for AI agents",
      "url": "https://coijournal.com/resources/agents/",
      "publisher": "COI Journal"
    }
  ]
}
---
## Why structure matters

Ask three reviewers to check the same certificate against a 12-page insurance exhibit and you'll get three answers. Not because anyone is careless, but because the exhibit has to be interpreted each time. Turn the exhibit into data once, and every later check starts from the same interpretation.

## The records

**Project.** Name, address, owner, prime contract reference, delivery method, wrap-up or not.

**Party.** Every entity that must be named: owner, GC, lender, architect, others. Exact legal names. Which endorsements each must appear on.

**Trade tier.** Many requirements scale by trade risk or contract value. Sonoma County's template, which we covered in [public owner requirements compared](/reports/public-owner-requirements-compared/), sets higher limits for some trades.

**Coverage line.** One record per line per tier:

| Field | Example |
|---|---|
| Line | General liability |
| Per occurrence | $2,000,000 |
| Aggregate | $4,000,000, per project |
| Endorsements | CG 20 10 or equivalent; CG 20 37 or equivalent; primary and noncontributory; waiver of subrogation |
| Completed operations duration | 3 years after final completion |
| Carrier floor | A- VII |
| Deductible cap | $25,000 |
| Source | Prime contract, Exhibit D, section 2.1 |

**Notice and delivery.** Who receives certificates and renewals, notice of cancellation requirements, and deadlines.

## Two records, one check

Keep what's **required** separate from what's been **shown**. The shown record holds each policy: carrier, NAIC number, policy number, dates, limits, and the endorsements received with their form numbers and schedules. The check compares the two, line by line, and records the result with a date.

That separation is what lets a renewal update one record and re-run every project the trade works on. See [one set of rules per project](/reports/per-project-requirements-and-renewals/).

## Why it helps AI review

An AI agent reading a certificate does better against a structured list than against a PDF exhibit, for the same reasons a person does. Our [COI review skill](/resources/agents/) is built around that idea: requirements as a list, findings as a table, people making the decision.

## Start small

You don't need software to do this. A spreadsheet with one tab per project, one row per line, and a source column is a big step up from a folder of PDFs. Pick the structure first. The tool can come later.
