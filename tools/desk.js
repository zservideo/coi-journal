// Editorial data for COI Journal that isn't an article: the people on the masthead, the COI Dictionary,
// the Spot the Gap rounds and The Number. tools/build.js turns these into pages.
//
// Rules: bios use only facts that are public or approved by the person. Forsured titles that are still
// under embargo stay out until they're public. Every specimen is sample data, never a real contractor.
// The Number shows only a sourced figure, with how it was built and who built it.

// ---------- the masthead ----------
// disclose: the material-connection line our principles require in every byline.
const PEOPLE = [
  {
    slug: 'zach-servideo',
    name: 'Zach Servideo',
    role: 'Publisher',
    initials: 'ZS',
    line: 'Chief Growth Officer, Forsured',
    bio: [
      'Zach publishes COI Journal and is the Chief Growth Officer of Forsured, the company that publishes it.',
      'A Built In columnist on portfolio careers and a former contributing editor at the Boston Business Journal, Zach set up COI Journal because the people who live with contractor certificates of insurance had almost nothing written for them.',
    ],
    covers: ['Publishing', 'The COI Gap Index', 'Publishing principles'],
    disclose: 'Zach is an executive at Forsured, which publishes COI Journal.',
  },
  {
    slug: 'colby-galipeau',
    name: 'Colby Galipeau',
    role: 'Associate Editor',
    initials: 'CG',
    line: 'Forsured',
    bio: [
      'Colby is COI Journal\'s associate editor: running the publishing calendar, editing The COI Digest and producing Plain Speak, our video series with Steve Massei.',
    ],
    covers: ['The COI Digest', 'Plain Speak video', 'Reader submissions'],
    disclose: 'Colby works for Forsured, which publishes COI Journal.',
  },
  {
    slug: 'steve-massei',
    name: 'Steve Massei',
    role: 'Contributing editor, construction',
    initials: 'SM',
    line: 'Owner, Massei Construction',
    bio: [
      'Steve owns and runs Massei Construction, a general contractor in the San Francisco Bay Area. Steve is also an active pilot and reads a COI the way a pilot runs a preflight checklist: every line, every time.',
      'Steve hosts Plain Speak, our short video series that explains one insurance idea in sixth-grade English. The premise, in Steve\'s words: "I\'m a GC owner. I don\'t know what I\'m doing with insurance, so I surrounded myself with insurance experts and product nerds."',
    ],
    covers: ['The GC view', 'Plain Speak video', 'Jobsite practice'],
    disclose: 'Steve is part of the Forsured team. Massei Construction uses Forsured.',
  },
  {
    slug: 'stephanie-massei',
    name: 'Stephanie Massei',
    role: 'Contributing editor, operations',
    initials: 'SM',
    line: 'Owner, Milestone Construction Group',
    bio: [
      'Stephanie owns Milestone Construction Group and writes about the back office of compliance: collecting certificates from trade contractors, chasing endorsements and keeping a project file that holds up when someone asks for it.',
    ],
    covers: ['Contractor operations', 'Collecting COIs', 'Back-office practice'],
    disclose: 'Stephanie is part of the Forsured team. Milestone Construction Group uses Forsured.',
  },
  {
    slug: 'erik-wenstone',
    name: 'Erik Wenstone',
    role: 'Contributing editor, brokerage',
    initials: 'EW',
    line: 'Principal, CMR Risk & Insurance Services',
    bio: [
      'Erik is a principal at CMR Risk & Insurance Services, a construction insurance brokerage, and sits on the board of RiskProNet, a network of independent brokers. Erik writes about the broker side of the certificate: what gets asked for, what gets issued and why the two drift apart.',
    ],
    covers: ['The broker view', 'Endorsements', 'Program design'],
    disclose: 'Erik is part of the Forsured team. CMR Risk & Insurance Services is a Forsured partner.',
  },
];

// ---------- the COI Dictionary ----------
// lib: the forsured.ai explainer that goes deeper, when one exists.
const TERMS = [
  {
    slug: 'certificate-of-insurance',
    term: 'Certificate of insurance (COI)',
    short: 'Certificate of insurance',
    forms: ['ACORD 25'],
    def: 'A one-page summary of a contractor\'s insurance at the moment it was issued. In construction it is almost always the ACORD 25, the Certificate of Liability Insurance.',
    sections: [
      ['On the certificate', 'Policy types, policy numbers, policy dates and limits, the producer (the broker who issued it), the insured and the certificate holder. A description box carries notes such as project names and additional insured wording.'],
      ['What to check', 'That every coverage your project requires is listed, the limits meet the requirement, the dates run through the work, and the insured name matches the contract.'],
      ['The common gap', 'Treating the certificate as the coverage. The ACORD 25 says it is issued as a matter of information only and confers no rights on the certificate holder. Rights come from the policy and its endorsements.'],
    ],
    lib: ['/blog/compliance-isnt-coverage/', "A COI on file isn't proof of coverage"],
    related: ['additional-insured', 'notice-of-cancellation'],
  },
  {
    slug: 'additional-insured',
    term: 'Additional insured (AI)',
    short: 'Additional insured',
    forms: ['CG 20 10', 'CG 20 37', 'CG 20 38'],
    def: 'A person or company added to someone else\'s liability policy, usually the owner and the general contractor on a trade contractor\'s policy. Status comes from an endorsement, not from the certificate.',
    sections: [
      ['On the certificate', 'A "Y" in the ADDL INSD column and, often, a line in the description box. Neither one creates coverage by itself.'],
      ['What to check', 'That the endorsement is attached and names, or automatically includes, the parties your contract requires. CG 20 10 covers ongoing operations, CG 20 37 covers completed operations, and CG 20 38 can extend status to other parties up the contract chain.'],
      ['The common gap', 'The box is checked and no endorsement exists, or the endorsement covers ongoing work only and the project needs completed operations too.'],
    ],
    lib: ['/blog/completed-operations-additional-insured/', 'Does additional insured status cover you after the job is done?'],
    related: ['completed-operations', 'primary-and-noncontributory'],
  },
  {
    slug: 'completed-operations',
    term: 'Completed operations',
    short: 'Completed operations',
    forms: ['CG 20 37'],
    def: 'Liability for injury or damage that shows up after a contractor\'s work is finished, such as a leak or a collapse months after turnover. For an additional insured, it usually needs its own endorsement.',
    sections: [
      ['On the certificate', 'It rarely appears at all. The products-completed operations aggregate sits in the general liability limits, which says nothing about whether you are covered as an additional insured after completion.'],
      ['What to check', 'That a completed operations additional insured endorsement, such as CG 20 37, is attached, and how many years after completion your contract requires it to stay in force.'],
      ['The common gap', 'Ongoing operations coverage only. The project ends, the claim arrives later and the additional insured status ended with the work.'],
    ],
    lib: ['/blog/completed-operations-additional-insured/', 'Does additional insured status cover you after the job is done?'],
    related: ['additional-insured', 'certificate-of-insurance'],
  },
  {
    slug: 'primary-and-noncontributory',
    term: 'Primary and noncontributory',
    short: 'Primary and noncontributory',
    forms: ['CG 20 01'],
    def: 'Wording that makes the contractor\'s policy pay first for the additional insured, without asking the additional insured\'s own policy to share the loss.',
    sections: [
      ['On the certificate', 'Usually a line in the description box. The ACORD 25 has no checkbox for it.'],
      ['What to check', 'An endorsement such as CG 20 01 that applies when your written contract requires it, on the general liability policy and, if your requirements say so, the umbrella.'],
      ['The common gap', 'The description box says "primary and noncontributory" and no endorsement backs it up, so your own policy ends up sharing the claim.'],
    ],
    lib: ['/blog/primary-and-noncontributory/', 'What does primary and noncontributory mean on a COI?'],
    related: ['additional-insured', 'waiver-of-subrogation'],
  },
  {
    slug: 'waiver-of-subrogation',
    term: 'Waiver of subrogation',
    short: 'Waiver of subrogation',
    forms: ['CG 24 04', 'WC 00 03 13'],
    def: 'A promise by the contractor\'s insurer not to sue you to recover what it paid on a claim. Construction contracts usually require it on general liability, auto and workers\' compensation.',
    sections: [
      ['On the certificate', 'A "Y" in the SUBR WVD column for each policy that carries it.'],
      ['What to check', 'An endorsement for each policy your contract names: CG 24 04 or a blanket version for general liability, and WC 00 03 13 or a state form for workers\' compensation.'],
      ['The common gap', 'The waiver is on general liability but missing from workers\' compensation, the line where an injured worker\'s claim lands.'],
    ],
    lib: ['/blog/waiver-of-subrogation-coi/', 'What does waiver of subrogation mean on a COI?'],
    related: ['primary-and-noncontributory', 'certificate-of-insurance'],
  },
  {
    slug: 'per-project-aggregate',
    term: 'Per project aggregate',
    short: 'Per project aggregate',
    forms: ['CG 25 03'],
    def: 'An endorsement that gives each construction project its own general aggregate limit, so claims on one job can\'t use up the limit for yours.',
    sections: [
      ['On the certificate', 'The general aggregate line has boxes for policy, project and location. The project box should be checked.'],
      ['What to check', 'The project box and an attached endorsement such as CG 25 03, the Designated Construction Project(s) General Aggregate Limit.'],
      ['The common gap', 'A per policy aggregate shared across every job the contractor runs. A busy year elsewhere can leave little of the limit for your project.'],
    ],
    lib: ['/blog/how-to-check-a-contractor-coi/', 'How to check a contractor COI against your project requirements'],
    related: ['certificate-of-insurance', 'additional-insured'],
  },
  {
    slug: 'notice-of-cancellation',
    term: 'Notice of cancellation',
    short: 'Notice of cancellation',
    forms: ['ACORD 25'],
    def: 'Advance notice that a contractor\'s policy is being cancelled. The certificate itself doesn\'t promise to tell you.',
    sections: [
      ['On the certificate', 'The current ACORD 25 says notice will be delivered in accordance with the policy provisions. That is a pointer to the policy, not a promise to the certificate holder.'],
      ['What to check', 'If your contract requires notice to you, an endorsement on the policy that names you to receive it, and a process to recheck certificates before they expire.'],
      ['The common gap', 'Relying on a certificate from the start of the job. A policy can be cancelled for nonpayment mid-project and the certificate in your file still looks fine.'],
    ],
    lib: ['/blog/notice-of-cancellation-coi/', "Will a COI tell you if a contractor's policy is cancelled?"],
    related: ['certificate-of-insurance', 'per-project-aggregate'],
  },
];

// ---------- Spot the Gap ----------
// [coverage, project requires, certificate shows, null for meets or the gap, dictionary slug that explains it]
const ROUNDS = [
  {
    slug: 'electric',
    title: 'Round 1: the electrician',
    insured: 'Sample Electric Co.',
    project: 'Sample mid-rise, 2026 to 2027',
    rows: [
      ['General liability', '$1M / $2M', '$1M / $2M', null, null],
      ['Additional insured', 'CG 20 10 + CG 20 37', 'Box checked, no endorsement', 'The box is checked, but no endorsement is attached, so there\'s no proof you\'re covered.', 'additional-insured'],
      ['Umbrella', '$10M', '$5M', 'The umbrella is $5M short of the requirement.', null],
      ['Workers\' comp', 'Statutory + waiver', 'Statutory, no waiver', 'No waiver of subrogation on workers\' comp, where injury claims land.', 'waiver-of-subrogation'],
      ['Policy term', 'Through Aug 2027', 'Expires Mar 2027', 'The policy expires five months before the work ends.', null],
    ],
  },
  {
    slug: 'drywall',
    title: 'Round 2: the drywall contractor',
    insured: 'Sample Drywall LLC',
    project: 'Sample school addition, 2027',
    rows: [
      ['Each occurrence', '$1M', '$1M', null, null],
      ['General aggregate', 'Per project (CG 25 03)', '$2M, per policy', 'The aggregate is shared with every other job this contractor has.', 'per-project-aggregate'],
      ['Additional insureds', 'Owner and GC', 'GC only', 'The owner isn\'t named, so the owner isn\'t covered.', 'additional-insured'],
      ['Primary and noncontributory', 'Required (CG 20 01)', 'Not shown', 'Without it, your own policy may have to share the loss.', 'primary-and-noncontributory'],
      ['Auto liability', '$1M combined single limit', '$1M combined single limit', null, null],
    ],
  },
  {
    slug: 'roofing',
    title: 'Round 3: the roofer',
    insured: 'Sample Roofing Inc.',
    project: 'Sample warehouse reroof, 2027',
    rows: [
      ['Completed operations AI', 'CG 20 37, 3 years after completion', 'CG 20 10 only', 'Ongoing operations only. A leak after turnover isn\'t covered for you.', 'completed-operations'],
      ['GL waiver of subrogation', 'CG 24 04', 'CG 24 04 attached', null, null],
      ['Umbrella', 'Follows form, includes AIs', '$5M, AI status not stated', 'Nothing shows the umbrella covers you as an additional insured.', 'additional-insured'],
      ['Notice of cancellation', '30 days to certificate holder', 'Per policy provisions', 'The certificate makes no promise to tell you if the policy is cancelled.', 'notice-of-cancellation'],
      ['Workers\' comp state', 'California', 'California', null, null],
    ],
  },
];

// ---------- The Number ----------
// One sourced figure, with the arithmetic behind it and an honest note on who produced it.
const THE_NUMBER = {
  figure: '$36,400',
  unit: 'a year',
  what: 'One vendor\'s estimate of the labor cost of tracking contractor COIs by hand, for an organization managing 100 or more active vendors.',
  math: [['20', 'hours a week'], ['× 52', 'weeks'], ['= 1,040', 'hours a year'], ['× $35', 'an hour'], ['= $36,400', 'a year']],
  markup: 'Our read: the 20 hours is the top of a 15 to 20 hour range that the vendor says its own clients report saving. It is a marketing estimate, not a time study. We\'re running it because it\'s the only published number we found, and we\'ll replace it when we have our own.',
  source: { title: 'The $36,000 Problem: What Manual COI Tracking Is Really Costing You', publisher: 'BCS (Business Credentialing Services)', date: 'May 14, 2026', url: 'https://www.getbcs.com/blog/the-36000-problem-what-manual-coi-tracking-is-really-costing-you' },
};

module.exports = { PEOPLE, TERMS, ROUNDS, THE_NUMBER };
