# Story → Test Case Process

Reverse-engineered from how CEP v1's own automation was actually built (see
`../CEPV1_Reference/CEPV1_AUTOMATION_WORKFLOW.md`), refined through a couple of false
starts on CEP v2 (a story-per-module attempt that was too coarse, and a test-case pilot
written before the story layer was right). This is the process itself — no CEP v2
content lives in this file. Everything CEP v2 gets built against this once it's
confirmed.

## Step 1 — Write a Story

A story is **one specific, distinct goal** a user is trying to accomplish.

Format: _"As a `<role>`, I want `<goal>`, so that `<benefit>`."_

**Rule for what counts as one story vs. two:** if two behaviors serve genuinely
different goals, they're separate stories — e.g. "build a quiz from the question bank,"
"attempt a quiz," and "review quiz results" are three different things someone sets out
to do, so they're three stories (this matches how CEP v1 itself split them —
`CICST-1089` "create a custom quiz from Question bank" was its own story, separate from
attempting or reviewing one).

If a behavior is just a variant or condition of the _same_ goal — e.g. attempting a quiz
specifically in split-screen mode — it stays inside that one story. It does not become
its own story; it becomes a test case under Step 2's "Edge" or "Cross-Mode" angle
instead.

**Anti-pattern to avoid** (this is exactly where the first CEP v2 attempt went wrong):
one story per _module_ (e.g. a single "Players" story covering quiz + worksheet +
ebook + checkpoint + code editor). A module is a grouping label for navigation, not a
story. Group stories by module for readability, but never let the module boundary
substitute for the goal boundary.

## Step 2 — Decompose the story by asking "how could this break?"

For every story, work through the same fixed set of angles, every time, in the same
order:

| Angle              | Question                                                      |
| ------------------ | ------------------------------------------------------------- |
| Functional         | Does the intended thing actually happen?                      |
| Negative           | What happens on bad/invalid input or a failure state?         |
| Edge/Boundary      | Empty state? First/last item? Done rapidly or repeatedly?     |
| Cross-Mode         | Does it survive a Teach↔Plan Mode switch?                     |
| Concurrency        | Does it hold up with multiple tabs/sessions/accounts at once? |
| Interruption       | What if network or session drops mid-action?                  |
| Performance/Stress | What if pushed past normal volume or session length?          |
| Regression         | Is there a specific, already-known bug to re-check here?      |

Not every angle applies to every story. But every story gets checked against all eight —
"doesn't apply here" is a decision to make explicitly, not an angle to silently skip.

## Step 3 — Tag each test case with a Testing Type, so nothing is left uncovered

An **angle** (Step 2) is _what condition_ is being checked. A **testing type** is _what
kind of test run_ the case belongs to — used to decide when it runs, how often, and for
whom. They're a separate dimension, and a single test case can carry an angle tag and
more than one testing-type tag at once (e.g. "login succeeds" is Functional-angle,
Smoke-type, and UAT-type, all three).

| Testing Type            | Purpose                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Smoke                   | Fastest possible check the core path isn't broken — run first, before anything else |
| Sanity                  | Narrow, quick check focused on one recent change/fix, not the whole story           |
| Functional              | The full happy-path acceptance check for the story                                  |
| Integration             | Does this story hold up when another module/feature is involved at the same time?   |
| System / End-to-End     | Full cross-module journey, not just this story in isolation                         |
| Regression              | Re-run of previously-passing cases, to catch something else breaking                |
| Compatibility           | Same check across different browsers/devices/screen sizes                           |
| Performance/Load        | Behavior under volume or sustained use                                              |
| Security                | Auth, session, and data-handling checks                                             |
| Usability/Accessibility | Can it actually be used — keyboard nav, screen reader, clear error messaging        |
| UAT                     | Final client/stakeholder sign-off pass on the story as a whole                      |

## Step 4 — Turn each answer into one atomic test case

One test case = **one action + one expected result**, carrying its angle tag (Step 2)
and testing-type tag(s) (Step 3). Specific enough that anyone (or a script) can execute
it and get an unambiguous pass or fail. A case never checks two things at once — if it
would need "and," it's two cases.

## Step 5 — Group test cases under their story, for traceability

The grouping — a suite, a folder, a table — is named after the story it belongs to, so a
failure always traces back to a specific user goal, never just "something in this module
broke." This is what CEP v1's `describe("<Jira Key> <Story Summary>")` convention did,
and what CEP v2 currently has no equivalent of.

## Automation scope — Plan Mode is excluded

Plan Mode is **out of scope for automation** (Steps 6-8). This applies to:

- Any **Cross-Mode**-angle test case (Step 2) inside an otherwise Teach-Mode story —
  it stays in the story's documentation as a manual-only check, just skipped when that
  story gets automated.
- Any story or module that is **Plan-Mode-native** — currently just `Compass.md`, since
  both its stories are about Plan Mode specifically, not a Teach Mode flow with a
  Plan Mode side-check.

Nothing gets deleted from the existing story files over this — the Plan Mode cases stay
as documented manual coverage (CEP v2's Plan Mode gap is real and still worth testing by
hand, per `../Manual_Testing/CEPV2_FINAL_MANUAL_REGRESSION_PLAN.md` §4). This rule only
governs what Step 6 onward picks up.

## Step 6 — Automate each test case as an independent script

Skips every Cross-Mode-angle case and every Compass story, per the scope rule above.

## Step 7 — Run the tests and produce a report

No scheduling requirement at this stage — a run just needs to happen and produce a
report. When/whether it's put on a recurring schedule is a separate, later decision, not
part of this process.

## Step 8 — Feed the report back into the story's status

Not the other way round. A story only gets marked done/automated/broken after real runs
against it exist — never marked in advance of having run anything.

---

## Current execution order

Stay at **Step 1 only**, across the whole product, until every story is written and
confirmed. Do not start Step 2 (decomposition) on any individual module until the full
story list is signed off — go broad before going deep.

## Decisions confirmed

- Step 3's testing-type list is confirmed as-is.
- Step 5's traceability grouping: **one file per module, with a short ID + clearly
  delimited section per story inside it** (e.g. `### PLR-02 — Attempt a quiz`), not one
  file per story. The ID does the traceability work, not the file boundary — this keeps
  file count sane (22 files, not 66+) while still tracing every failure back to one
  exact story. When automation is eventually written, each story's section converts 1:1
  into its own spec file, so nothing is lost by deferring that split.

This file is now the confirmed reference every future CEP v2 story/test-case pass
follows.
