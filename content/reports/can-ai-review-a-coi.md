---
{
  "title": "Can AI review a COI? What machines do well, and where people stay in the loop",
  "short": "Can AI review a COI?",
  "question": "Can AI accurately review certificates of insurance and endorsements against project insurance requirements?",
  "description": "A COI Journal white paper on what AI can and can't do when reviewing contractor COIs and endorsements against project requirements, and where people stay in charge.",
  "dek": "AI is good at reading documents and comparing them with rules. Certificate review is mostly that. But some calls need a person, and some questions can't be answered from the documents at all.",
  "kind": "White paper",
  "number": "R-10",
  "date": "2026-11-13T00:00:00-05:00",
  "byline": "The editors",
  "docket": "COIJ-26-0011",
  "about": ["certificate-of-insurance", "additional-insured", "completed-operations"],
  "takeaways": [
    "Most of a COI review is extraction and comparison: read the certificate and endorsements, read the requirements, match line by line. That is work AI does well.",
    "AI review is only as good as the documents it gets. It can't check an endorsement nobody sent.",
    "Some calls need a person: whether a carrier's own form is equivalent to an ISO form, whether to accept a shortfall, and what to do about it.",
    "Insurers' own AI use is now under regulator scrutiny; the NAIC's model bulletin on AI governance has been adopted by 24 states and D.C. Buyers can ask vendors similar governance questions."
  ],
  "method": "This qualitative paper describes the structure of the review task and draws on reporting about the NAIC Model Bulletin on the Use of AI Systems by Insurers. It does not test or rank any product. COI Journal's publisher sells software that uses AI for this task; we disclose it here. General information, not legal or insurance advice.",
  "sources": [
    { "title": "US NAIC Spring 2026 National Meeting Highlights: Innovation, Cybersecurity and Technology (H) Committee Update", "url": "https://www.mayerbrown.com/en/insights/publications/2026/04/us-naic-spring-2026-national-meeting-highlights-innovation-cybersecurity-and-technology-h-committee-update", "publisher": "Mayer Brown", "date": "April 2026" },
    { "title": "Nearly Half of States Have Now Adopted NAIC Model Bulletin on Insurers' Use of AI", "url": "https://www.quarles.com/newsroom/publications/nearly-half-of-states-have-now-adopted-naic-model-bulletin-on-insurers-use-of-ai", "publisher": "Quarles & Brady, Meghan O'Connor", "date": "April 2, 2025" }
  ]
}
---
## The task, broken down

A certificate review has four steps.

1. **Read** the certificate and each endorsement: carriers, policy numbers, dates, limits, form numbers, names, wording.
2. **Read** the project's requirements: coverages, limits, endorsements, durations, names.
3. **Compare** them line by line and mark what passes and what fails.
4. **Decide** what to do about each failure.

Steps one to three are reading and matching. They are the kind of structured document work current AI systems handle well, at a speed and consistency no person on a deadline can match across hundreds of certificates. Step four is a judgment call.

## Where AI does well

- **Extraction.** Pulling limits, dates, names and form numbers from certificates and endorsements, including scanned ones.
- **Matching.** Checking each requirement against what the documents show, and doing it the same way every time.
- **Explaining.** Saying which requirement failed and what document would fix it, in plain language.
- **Watching.** Tracking every expiration date and asking for renewals on time.

## Where it can't help

- **Missing documents.** If the trade sent only the certificate, there is no endorsement to read. A good system flags the absence. It can't infer the endorsement exists.
- **What isn't on paper.** Whether a policy was cancelled yesterday, or whether the crew on site works for the named insured, isn't in the documents. See our brief on [what 2026's cases say about trusting a COI](/reports/rented-falsified-excluded/).
- **The contract itself.** If the requirements are vague, the comparison is vague. AI can point out vagueness. It can't decide what the contract meant.

## Where a person should decide

- **Equivalence.** Carriers write their own endorsement forms. Whether one is "equivalent" to CG 20 10 or CG 20 37 is a reading a person, often a broker, should confirm. See [additional insured](/dictionary/additional-insured/).
- **Exceptions.** Whether to accept a lower umbrella limit from a small trade, or let work start while an endorsement is on the way, is a business decision.
- **Remedies.** Stopping work, withholding payment or buying coverage on a trade's behalf are calls for the people who own the contract.

## Questions to ask any AI review tool

The insurance industry's own use of AI is under regulator scrutiny. The NAIC adopted a model bulletin on insurers' use of AI systems on December 4, 2023, and 24 states and D.C. had adopted it as of April 2026, [Mayer Brown reported](https://www.mayerbrown.com/en/insights/publications/2026/04/us-naic-spring-2026-national-meeting-highlights-innovation-cybersecurity-and-technology-h-committee-update). The bulletin asks insurers for a written AI governance program, vendor diligence and testing, [according to Quarles & Brady](https://www.quarles.com/newsroom/publications/nearly-half-of-states-have-now-adopted-naic-model-bulletin-on-insurers-use-of-ai).

The bulletin applies to insurers, not to GCs or their software. But its questions are good ones for any buyer:

1. What does the system read: certificates only, or endorsements too?
2. How does it show its work for each pass and fail?
3. Who reviews its exceptions, and how are its errors caught?
4. How is it tested, and how often?
5. What happens to our documents and data?

## The bottom line

AI can do most of the reading and matching in a COI review, faster and more consistently than people can. People still own the exceptions and the decisions. The best setup lets machines find the gaps and lets people decide what to do about them. See our brief on [what insurance regulators say about AI](/reports/naic-ai-bulletin-and-coi-review/).
