---
{
  "title": "A data model for project requirements",
  "short": "A data model for requirements",
  "question": "How should a general contractor structure project insurance requirements as data so certificates can be checked against them consistently, by people or software?",
  "description": "A COI Journal white paper proposing a simple data model for project insurance requirements: projects, tiers, lines, endorsements, parties and the source clause.",
  "dek": "Requirements that live in a PDF get read differently by every reviewer. Requirements stored as data get checked the same way every time, by a person, a spreadsheet, software or an AI agent.",
  "answer": "Structure project insurance requirements as records: the project, every party that must be named, trade tiers, one record per coverage line with limits, endorsements, durations, carrier floor and source clause, and notice rules. Keep what's required apart from what each trade has shown, so every certificate is checked against the same interpretation.",
  "kind": "White paper",
  "number": "R-39",
  "date": "2026-11-23T06:30:00-05:00",
  "byline": "COI Journal News Staff",
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
  "faq": [
    {
      "q": "How should a GC structure project insurance requirements?",
      "a": "As records rather than a PDF exhibit: the project, every party that must be named with exact legal names, trade tiers, one record per coverage line per tier, and notice and delivery rules. Each coverage line holds limits, required endorsements, completed operations duration, carrier floor, deductible cap and the contract clause it came from."
    },
    {
      "q": "What fields belong in a coverage line record?",
      "a": "The line, per occurrence and aggregate limits (and whether the aggregate applies per project), required endorsements by form, completed operations duration, carrier rating floor, deductible cap, and the source clause in the prime contract or exhibit. The source field lets anyone trace each requirement back to the paper that created it."
    },
    {
      "q": "Why separate required records from shown records?",
      "a": "Because a renewal should update one record and re-run every project the trade works on. The required record holds what the contract asks for. The shown record holds each policy: carrier, NAIC number, policy number, dates, limits and the endorsements received. The check compares them line by line and records the result with a date."
    },
    {
      "q": "Does structured requirements data help AI review certificates?",
      "a": "Yes. An AI agent reading a certificate does better against a structured list than against a PDF exhibit, for the same reasons a person does: the requirement is already interpreted once. COI Journal's COI review skill is built that way, with requirements as a list, findings as a table and people making the decision."
    },
    {
      "q": "Do you need software to structure insurance requirements?",
      "a": "No. A spreadsheet with one tab per project, one row per coverage line and a source column is a big step up from a folder of PDF exhibits. Pick the structure first, so every reviewer reads requirements the same way. The tool can come later and inherit the structure."
    }
  ],
  "method": "A proposed structure from COI Journal News Staff, based on the public owner requirements and ISO and NCCI forms reviewed in our earlier reports. It's a starting point, not a standard. General information, not legal or insurance advice.",
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
## Why structure project insurance requirements as data?

Ask three reviewers to check the same certificate against a 12-page insurance exhibit and you'll get three answers. Not because anyone is careless, but because the exhibit has to be interpreted each time. Turn the exhibit into data once, and every later check starts from the same interpretation.

## What records make up a project's insurance requirements?

**Project.** Name, address, owner, prime contract reference, delivery method, wrap-up or not.

**Party.** Every entity that must be named: owner, GC, lender, architect, others. Exact legal names. Which endorsements each must appear on, such as [additional insured](/dictionary/additional-insured/) and waiver of subrogation.

**Trade tier.** Many requirements scale by trade risk or contract value. [Sonoma County's template](https://sonomacounty.gov/administrative-support-and-fiscal-services/human-resources/divisions-and-units/liability-and-insurance/insurance/insurance-requirements-for-contracts-and-agreements/view-all-insurance-requirement-templates/template-1), which we covered in [public owner requirements compared](/reports/public-owner-requirements-compared/), sets higher limits for some trades.

**Coverage line.** One record per line per tier:

Table: One coverage line record, with example values
| Field | Example |
|---|---|
| Line | General liability |
| Per occurrence | $2,000,000 |
| Aggregate | $4,000,000, per project |
| Endorsements | CG 20 10 or equivalent; CG 20 37 or equivalent; primary and noncontributory; waiver of subrogation |
| Completed operations duration | 3 years after final completion |
| Carrier floor | A- VII (an [AM Best rating and size class](https://www.bankrate.com/insurance/am-best/)) |
| Deductible cap | $25,000 |
| Source | Prime contract, Exhibit D, section 2.1 |

**Notice and delivery.** Who receives certificates and renewals, notice of cancellation requirements, and deadlines.

## Why keep required and shown records separate?

Keep what's **required** separate from what's been **shown**. The shown record holds each policy as the [ACORD 25](https://www.dfs.ny.gov/system/files/documents/2025/12/acord-25-2025-12-liability.pdf) lists it: carrier, NAIC number ([searchable at the NAIC](https://content.naic.org/index.php/cis_consumer_information.htm)), policy number, dates, limits, and the endorsements received with their form numbers and schedules. The check compares the two, line by line, and records the result with a date.

That separation is what lets a renewal update one record and re-run every project the trade works on. See [one set of rules per project](/reports/per-project-requirements-and-renewals/).

## How does structured data help AI review of COIs?

An AI agent reading a certificate does better against a structured list than against a PDF exhibit, for the same reasons a person does. Our [COI review skill](/resources/agents/) is built around that idea: requirements as a list, findings as a table, people making the decision.

## Can a GC structure requirements without software?

You don't need software to do this. A spreadsheet with one tab per project, one row per line, and a source column is a big step up from a folder of PDFs. Pick the structure first. The tool can come later.
