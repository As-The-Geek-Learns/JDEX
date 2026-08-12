# Pull Request

## What changed

<!-- One or two sentences. The commit log has the detail. -->

## Why

<!-- The problem this solves. If it's from an issue, link it: Closes #NN -->

## Local gates

<!-- Filled automatically by bin/ship.sh — leave as-is if you ran it. -->

- [ ] `lefthook run pre-commit` clean
- [ ] `lefthook run pre-push` clean
- [ ] `cr review --base main` run and findings addressed
      <!-- `main` is the executable default. If this PR targets a different
           branch, substitute it: reviewing a release- or feature-branch PR
           against main reports drift that is not this PR's diff, and misses
           drift that is. -->
- [ ] `act` dry-run passed (if workflows changed)

## Review focus

<!-- Point CodeRabbit and future-you at the risky part.
     Delete this section if the change is trivial. -->

## Content capture

<!-- ASTGL pipeline: was there a decision point, aha moment, or course
     correction worth writing up? Note it here while it's fresh. -->

**Tick exactly one.** If you tick the second, write the note on the same line —
an empty "Captured" is indistinguishable from an unticked box, which is the
thing this section exists to avoid.

- [ ] Nothing to capture
- [ ] Captured — note: _(what the decision, aha, or course-correction was)_
