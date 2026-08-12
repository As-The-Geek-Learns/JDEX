#!/usr/bin/env bash
# WHAT: Self-test for scan-staged-binaries.sh.
#
# WHY:  This gate exists because a scanner reported "clean" on files it never
#       read. A test that cannot tell those two states apart would reproduce the
#       original defect, so every case below asserts on WHAT WAS INSPECTED, not
#       just on the exit code.
#
# FIXTURES ARE REAL, DELIBERATELY. The PDFs are built with genuinely
#       Flate-compressed content streams (python3 + zlib, both stdlib) and the
#       xlsx is a real zip container. A text file merely NAMED .pdf would pass
#       every check here while proving nothing -- that shortcut is exactly how a
#       fixture ends up encoding the wrong belief.
#
# Run:  scripts/selftest-binary-scan.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/scan-staged-binaries.sh"

# Detach from any inherited git context before the throwaway repos below are created.
#
# WHY: git exports GIT_DIR (an absolute path) into every hook it runs, so the `git init`
# on line ~76 produced a repo that still resolved to the OUTER repository -- inside the
# pre-push hook this failed with "fatal: this operation must be run in a work tree".
# The suite passes standalone and fails only on a real `git push`. SUT above is resolved
# from BASH_SOURCE, not from git, so nothing here needs the ambient repo.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
      GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_PREFIX GIT_NAMESPACE
# Split so the literal never appears as a matchable token in this file -- a test
# fixture that trips the primary gate would block the commit that adds the test.
SECRET="cr-""0123456789abcdefghijklmnop"

# Assert EVERY tool this suite depends on, not just the obvious one.
#
# WHY all three: a missing tool here does not produce a failure, it produces a
# false pass, which is the defect this whole suite was written against.
#   gitleaks  -- the system under test.
#   python3   -- builds every fixture. Without it `set -e` kills the run inside
#                build_pdf before a single case reports, so the suite dies rather
#                than passing; loud, but it would still be reported as "no output".
#   pdftotext -- what the SUT uses for PDFs. Without it the SUT emits UNKNOWN for
#                doc.pdf, which is the exact string case 10 asserts. Every PDF case
#                then goes green while proving nothing about the version canary
#                they exist to check. This is the dangerous one: silent, and it
#                looks identical to success.
# A missing tool is a FAILURE, not a skip. This exited 0 under the banner
# "skipping loudly beats passing falsely" -- but the loudness was only in the
# message. lefthook reads the exit code, so `selftest-binary-scan` went GREEN on
# a machine that could not run the cases, and a green self-test is exactly the
# claim "the binary gate is verified". Verified on a PATH without pdftotext:
# it printed the SKIP line and exited 0.
#
# Exit 1 instead. If a machine genuinely cannot run this, that is a fact about
# the gate's coverage there and should be visible, not absorbed.
# All three are checked before exiting, so a machine missing two tools learns
# about both in one run instead of one per attempt.
_missing=0
for tool in gitleaks python3 pdftotext; do
  command -v "$tool" >/dev/null 2>&1 || {
    printf '\n✗ %s is not installed — this suite cannot distinguish pass from no-op without it.\n' "$tool" >&2
    [ "$tool" = pdftotext ] && printf '      brew install poppler\n' >&2
    _missing=1
  }
done
if [ "$_missing" -ne 0 ]; then
  printf '  A skipped case is not a passed case; refusing to report success.\n\n' >&2
  exit 1
fi

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ✓ $1"; }
# shellcheck disable=SC2001  # prefixing EVERY line needs sed; ${x//a/b} cannot.
bad()  { fail=$((fail+1)); echo "  ✗ $1"; echo "$2" | sed 's/^/        /'; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# --- fixture builders (stdlib only, so this runs anywhere) ------------------
build_pdf() {  # build_pdf <out> <text|empty>
  python3 - "$1" "${2-}" <<'PY'
import io, sys, zlib
out, text = sys.argv[1], sys.argv[2]
content = (f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET" if text else "").encode()
stream = zlib.compress(content)           # real deflate -- the whole point
objs = [
    b"<</Type/Catalog/Pages 2 0 R>>",
    b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
    b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R"
    b"/Resources<</Font<</F1 5 0 R>>>>>>",
    b"<</Length %d/Filter/FlateDecode>>\nstream\n" % len(stream) + stream + b"\nendstream",
    b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
]
buf = io.BytesIO(); buf.write(b"%PDF-1.4\n"); offs = []
for i, o in enumerate(objs, 1):
    offs.append(buf.tell()); buf.write(b"%d 0 obj " % i + o + b" endobj\n")
xref = buf.tell()
buf.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1))
for o in offs:
    buf.write(b"%010d 00000 n \n" % o)
buf.write(b"trailer <</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref))
open(out, "wb").write(buf.getvalue())
PY
}

build_xlsx() {  # build_xlsx <out> <text>
  python3 - "$1" "$2" <<'PY'
import sys, zipfile
out, text = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
    z.writestr("xl/sharedStrings.xml", f'<?xml version="1.0"?><sst><si><t>{text}</t></si></sst>')
PY
}

# --- harness ---------------------------------------------------------------
# Each case runs in a throwaway repo so staging state never leaks between them.
new_repo() {
  local d="$WORK/$1"; mkdir -p "$d"; cd "$d"
  # BEFORE `git init`, not after. This started life below the init and that was
  # wrong: `init.templateDir` and `init.defaultBranch` are read BY init, so a
  # developer's global config still shaped the fixture -- and a templateDir can
  # install hooks that then fire on every fixture commit in this suite. Isolating
  # after the fact leaves exactly the window the isolation exists to close.
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  git init -q .

  # Refuse to continue unless `git init` really produced a repo HERE.
  #
  # WHY this is worth six lines: when GIT_DIR is inherited (as it is inside every git
  # hook), `git init .` does not create a new repo -- it RE-INITIALISES the one GIT_DIR
  # points at, from a cwd that is not its work tree, and writes `core.bare = true` into
  # the shared config. On 2026-08-08 that ran during a real `git push` and left the
  # repository and both of its worktrees unusable until core.bare was reset by hand; the
  # `git config user.email t@t.t` below landed in the shared config in the same breath.
  # The unset above prevents it. This assertion is what makes a regression loud and
  # local instead of silent and repo-wide.
  local root; root="$(git rev-parse --show-toplevel 2>/dev/null || echo '')"
  if [ "$root" != "$(pwd -P)" ]; then
    echo "FATAL: temp repo resolved to '${root:-<none>}', not '$(pwd -P)'." >&2
    echo "       An ambient GIT_DIR is leaking in. Refusing to touch that repository." >&2
    exit 1
  fi

  # Identity only. The config ISOLATION is above, before `git init` -- see the
  # comment there for why the order matters. `--local` pins who the commits are
  # from; GIT_CONFIG_GLOBAL/SYSTEM stop everything else (core.hooksPath,
  # commit.gpgsign, core.autocrlf, a diff/merge driver, an alias shadowing a
  # porcelain command) from making this suite's result a property of whoever ran it.
  git config --local user.email t@t.t; git config --local user.name t
  cp "$SCRIPT_DIR/../.gitleaks.toml" .
  git add .gitleaks.toml
}

# The assignment sits in an `if` so a non-zero exit is consumed by the condition
# rather than by errexit -- which keeps `set -e` ARMED for the rest of the suite.
# `set +e`/`set -e` around it also works, but it disarms errexit for the duration,
# and a suite that turns off its own safety to observe a failure is one edit away
# from leaving it off.
run_sut() {
  if SUT_OUT="$("$SUT" 2>&1)"; then SUT_RC=0; else SUT_RC=$?; fi
}
# Same capture, with arguments. Kept separate so the no-argument default path --
# the one the pre-commit hook actually invokes -- is still exercised by a call
# that passes literally nothing.
run_sut_args() {
  if SUT_OUT="$("$SUT" "$@" 2>&1)"; then SUT_RC=0; else SUT_RC=$?; fi
}

echo "scan-staged-binaries.sh self-test"

# 1. THE CORE CASE: secret inside a really-compressed PDF must be caught.
new_repo c1
build_pdf secret.pdf "API key: $SECRET"
git add secret.pdf; run_sut
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in secret.pdf" <<<"$SUT_OUT"; then
  ok "compressed PDF: secret detected, commit blocked"
else bad "compressed PDF: secret NOT detected (rc=$SUT_RC)" "$SUT_OUT"; fi

# 2. REGRESSION GUARD for the approach itself: prove the raw-byte scan this
#    replaces would have MISSED that same file. If this ever starts passing,
#    raw scanning became viable and the pdftotext dependency can be revisited.
# rc is captured rather than piped: under `pipefail` ANY non-zero from gitleaks
# failed the pipeline, so an ERROR (exit 2, bad config, unreadable file) was
# reported as "raw-byte scan now finds it" -- a message pointing at the opposite
# conclusion from what happened. 0 = clean, 1 = leaks found, anything else = the
# scanner failed and this case proves nothing either way.
# `VAR=$(cmd); rc=$?` does NOT work under errexit: the assignment IS the command,
# so a non-zero substitution aborts the script before $? is ever read. Verified.
# That would have killed the suite precisely when gitleaks exits 1 -- the case
# this assertion exists to detect. `|| RAW_RC=$?` keeps errexit from firing.
RAW_RC=0
RAW_OUT=$(gitleaks stdin --no-banner --redact --config .gitleaks.toml < secret.pdf 2>&1) || RAW_RC=$?
if [ "$RAW_RC" -eq 0 ] && grep -q "no leaks found" <<<"$RAW_OUT"; then
  ok "raw-byte scan of the same PDF finds nothing (why pdftotext is required)"
elif [ "$RAW_RC" -eq 1 ]; then
  bad "raw-byte scan now finds it — revisit the pdftotext dependency" "$RAW_OUT"
else
  bad "raw-byte scan could not run (gitleaks exit $RAW_RC) — this case proved nothing" "$RAW_OUT"
fi

# 3. Secret inside a real xlsx (zip container) must be caught.
new_repo c3
build_xlsx book.xlsx "token $SECRET"
git add book.xlsx; run_sut
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in book.xlsx" <<<"$SUT_OUT"; then
  ok "xlsx: secret inside zip container detected"
else bad "xlsx: secret NOT detected (rc=$SUT_RC)" "$SUT_OUT"; fi

# 4. Clean binaries pass -- and REPORT that bytes were actually read.
new_repo c4
build_pdf clean.pdf "quarterly revenue notes, nothing sensitive"
build_xlsx clean.xlsx "ordinary spreadsheet text"
git add clean.pdf clean.xlsx; run_sut
if [ "$SUT_RC" -eq 0 ] && grep -qE "inspected 2 file\(s\), [1-9][0-9]* bytes read" <<<"$SUT_OUT"; then
  ok "clean binaries pass AND report non-zero bytes read"
else bad "clean binaries: wrong verdict or zero-byte 'pass' (rc=$SUT_RC)" "$SUT_OUT"; fi

# 5. Image-only PDF must read as UNKNOWN, never as clean. This is the exact
#    "scanned ~0 bytes -> no leaks found" failure the whole gate exists to stop.
new_repo c5
build_pdf scanned.pdf ""
git add scanned.pdf; run_sut
# Names the file AND the reason. A bare "UNKNOWN" match passes whenever ANY file
# is unknown, so this case would have stayed green while a different file failed
# and scanned.pdf sailed through -- the assertion would survive the very
# regression it exists to catch.
# -F and a bounded token: the `.` in "scanned.pdf" is a regex any-char, so a
# plain grep would also match "scannedXpdf". Fixed-string match, and the reason
# text is included so the assertion pins WHY the file was unknown, not just that
# its name appeared somewhere in the output.
if [ "$SUT_RC" -ne 0 ] && grep -qF 'scanned.pdf (no text layer' <<<"$SUT_OUT"; then
  ok "image-only PDF reports UNKNOWN instead of clean"
else bad "image-only PDF reported clean (rc=$SUT_RC)" "$SUT_OUT"; fi

# 5b. A RENAMED binary is still scanned. `--diff-filter=ACM` enumerated a rename
#     as nothing at all, so a `git mv` of a file holding a secret produced
#     "no binary or document files staged" and exit 0. Regression guard for ACMRT.
new_repo c5b
# Without this, a repo (or a user) with diff.renames=false reports the staged
# `git mv` as A, so --diff-filter=ACMRT never exercises the R path and this case
# silently stops testing what it was written to test.
git config diff.renames true
build_xlsx orig.xlsx "$SECRET"
git add orig.xlsx; git commit -qm "add" >/dev/null
git mv orig.xlsx renamed.xlsx; run_sut  # git mv already stages the rename
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in renamed.xlsx" <<<"$SUT_OUT"; then
  ok "a renamed binary is still scanned (ACMRT, not ACM)"
else bad "renamed binary escaped the scan (rc=$SUT_RC)" "$SUT_OUT"; fi

# 5c. SVG is TEXT that the primary gate skips by path. It must be INSPECTED --
#     not bucketed opaque, which reports "judge by hand" and passes.
new_repo c5c
printf '<svg xmlns="http://www.w3.org/2000/svg"><desc>k %s</desc></svg>\n' "$SECRET" > logo.svg
git add logo.svg; run_sut
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in logo.svg" <<<"$SUT_OUT"; then
  ok "a secret in an .svg is inspected, not reported opaque"
else bad "svg not inspected (rc=$SUT_RC)" "$SUT_OUT"; fi

# 5d. ...and a clean SVG must actually be READ, not silently skipped: a zero-byte
#     "pass" is the failure this whole file exists to catch.
new_repo c5d
printf '<svg xmlns="http://www.w3.org/2000/svg"><desc>company logo</desc></svg>\n' > clean.svg
git add clean.svg; run_sut
if [ "$SUT_RC" -eq 0 ] && grep -qE "inspected 1 file\(s\), [1-9][0-9]* bytes read" <<<"$SUT_OUT"; then
  ok "a clean .svg is read, with non-zero bytes reported"
else bad "clean svg not actually inspected (rc=$SUT_RC)" "$SUT_OUT"; fi

# 5e. A legacy-Office file is REPORTED, not invisible. .doc is skipped by
#     gitleaks' built-in path allowlist, so if it is also in no bucket here it
#     vanishes: the primary scan never reads it and this script says "no binary
#     or document files staged". The svg double-miss, measured again for OLE.
new_repo c5e
for _e in doc xls suo wsuo v2 vsidx; do
  printf 'key = %s\n' "$SECRET" > "memo.$_e"
done
git add memo.*; run_sut
# One staged set, one run, one JOINED assertion per extension (the filename must
# appear WITHIN the NOT INSPECTED record -- -A8 spans the six-line list), so no
# extension can quietly fall back into the invisible gap this case closed, and
# a name landing in UNKNOWN instead cannot masquerade as covered.
_5e_bad=""
for _e in doc xls suo wsuo v2 vsidx; do
  grep -A8 "NOT INSPECTED" <<<"$SUT_OUT" | grep -qF "memo.$_e" || _5e_bad="$_5e_bad memo.$_e"
done
if [ "$SUT_RC" -eq 0 ] && [ -z "$_5e_bad" ]; then
  ok "all six built-in-skipped formats are reported NOT INSPECTED (doc xls suo wsuo v2 vsidx)"
else bad "vanished or wrong bucket:${_5e_bad} (rc=$SUT_RC)" "$SUT_OUT"; fi

# 6. Opaque formats are reported as NOT INSPECTED but do not block.
new_repo c6
printf '\x89PNG\r\n\x1a\n binary junk' > shot.png
git add shot.png; run_sut
if [ "$SUT_RC" -eq 0 ] && grep -q "NOT INSPECTED" <<<"$SUT_OUT"; then
  ok "opaque file reported as NOT INSPECTED, does not block"
else bad "opaque file handling wrong (rc=$SUT_RC)" "$SUT_OUT"; fi

# 7. Filenames with spaces. This repo family really has one ("The High-Paying
#    YouTube Niches Report.pdf"), so word-splitting here would be a live bug.
new_repo c7
build_pdf "My Quarterly Report.pdf" "API key: $SECRET"
git add "My Quarterly Report.pdf"; run_sut
# Assert on "SECRET in <name>", not merely on the name appearing somewhere: the
# name also shows up in the UNKNOWN list, so the looser check passed against a
# deliberately broken build.
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in My Quarterly Report.pdf" <<<"$SUT_OUT"; then
  ok "filename with spaces handled"
else bad "filename with spaces mishandled (rc=$SUT_RC)" "$SUT_OUT"; fi

# 8. The STAGED blob is what gets scanned, not the worktree file. Staging a
#    secret and then cleaning the worktree copy must still block the commit --
#    it is the staged bytes that are about to ship.
new_repo c8
build_pdf sneaky.pdf "API key: $SECRET"
git add sneaky.pdf
build_pdf sneaky.pdf "totally innocent now"   # worktree cleaned AFTER staging
run_sut
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in sneaky.pdf" <<<"$SUT_OUT"; then
  ok "scans the staged blob, not the worktree copy"
else bad "scanned worktree instead of staged blob (rc=$SUT_RC)" "$SUT_OUT"; fi

# 9. No binaries staged -> fast, explicit no-op.
new_repo c9
printf 'plain text, primary gate handles this\n' > notes.md
git add notes.md; run_sut
# The message names the SOURCE searched ("...found in the index"). That is asserted
# rather than matched loosely: in CI the same sentence without a source reads the
# same whether the gate examined the right revision or the wrong one.
if [ "$SUT_RC" -eq 0 ] && grep -qF "no binary or document files found in the index" <<<"$SUT_OUT"; then
  ok "no binaries staged: explicit no-op, names the source"
else bad "empty case wrong (rc=$SUT_RC)" "$SUT_OUT"; fi

# 10. The version canary must fail closed. lefthook runs a bare `gitleaks`, so an
#     old binary on PATH is a real scenario (a reviewer's sandbox reported 1.7.3).
#     Simulate it with a stub that answers like a tool lacking these subcommands:
#     the gate must report UNKNOWN, not pass.
new_repo c10
build_pdf doc.pdf "API key: $SECRET"
git add doc.pdf
mkdir -p "$WORK/stub"
printf '#!/bin/sh\necho "unknown command" >&2\nexit 2\n' > "$WORK/stub/gitleaks"
chmod +x "$WORK/stub/gitleaks"
set +e
STUB_OUT="$(PATH="$WORK/stub:$PATH" "$SUT" 2>&1)"; STUB_RC=$?
set -e
# Assert the CAUSE, not just the word UNKNOWN -- and the cause moved. The
# version PRE-FLIGHT (guard in assertion-only mode) now rejects an unsupported
# binary before any scan runs, which is strictly earlier and better-attributed
# than the stdin canary that used to catch this. The canary remains as
# defence-in-depth for the case the guard cannot see: a binary that PASSES the
# version floor but whose subcommands still misbehave.
if [ "$STUB_RC" -ne 0 ] && grep -qF 'fails the version guard' <<<"$STUB_OUT"; then
  ok "unsupported gitleaks on PATH is refused by the version pre-flight"
else bad "unsupported gitleaks was not refused up front (rc=$STUB_RC)" "$STUB_OUT"; fi

# ---------------------------------------------------------------------------
# CI SOURCES. Everything above scans the index. The job this kit calls
# authoritative has no index, and for the whole life of this script that meant it
# ran no binary scan at all: a secret-bearing .xlsx was blocked locally and PASSED
# CI. These cases cover the sources that close that gap.
#
# Each one COMMITS the fixture and leaves the index clean on purpose. That is what
# makes them regression tests rather than restatements: run any of them against the
# pre-parameterisation script and it reports "no binary or document files staged"
# and exits 0, because a committed-but-unstaged file was invisible to it.
# ---------------------------------------------------------------------------

# 11. --range: a secret introduced by the branch must be caught.
new_repo c11
git commit -qm "base" >/dev/null
RANGE_BASE=$(git rev-parse HEAD)
build_xlsx book.xlsx "API key: $SECRET"
git add book.xlsx; git commit -qm "add xlsx" >/dev/null
run_sut_args --range "$RANGE_BASE" HEAD
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in book.xlsx" <<<"$SUT_OUT"; then
  ok "--range: secret in a committed xlsx detected"
else bad "--range missed a committed secret (rc=$SUT_RC)" "$SUT_OUT"; fi

# 12. --range must not report files the branch never touched. Two dots instead of
#     three would enumerate everything that landed on the base since the fork point
#     and blame this branch for it.
#
#     THE HISTORIES MUST DIVERGE for this to test anything. When BASE is a plain
#     ancestor of HEAD, `BASE..HEAD` and `BASE...HEAD` produce identical diffs, so
#     against a linear fixture this case passes whichever operator the script uses
#     and cannot detect the regression it is named for. So: fork the feature branch
#     FIRST, then add the secret to the base branch afterwards, and compare the
#     feature tip against the later base tip. Now two-dot would drag in
#     preexisting.xlsx (which the feature branch never saw) and three-dot does not.
new_repo c12
printf 'seed\n' > seed.txt; git add seed.txt; git commit -qm "fork point" >/dev/null
git checkout -q -b feature
printf 'text\n' > notes.md; git add notes.md; git commit -qm "innocent change" >/dev/null
git checkout -q -
build_xlsx preexisting.xlsx "API key: $SECRET"
git add preexisting.xlsx; git commit -qm "secret lands on base AFTER the fork" >/dev/null
RANGE_BASE=$(git rev-parse HEAD)
git checkout -q feature
run_sut_args --range "$RANGE_BASE" HEAD
# The range must also be NAMED in the output. Asserting only "clean and did not
# mention the file" is satisfied by a scanner that enumerated nothing at all --
# which is precisely how the pre-parameterisation script behaved, so that form of
# the check passed against the very defect it was added for. Requiring the source
# in the message makes the case fail unless a range was genuinely walked.
if [ "$SUT_RC" -eq 0 ] \
   && ! grep -q "preexisting.xlsx" <<<"$SUT_OUT" \
   && grep -q "$RANGE_BASE...HEAD" <<<"$SUT_OUT"; then
  ok "--range: pre-existing secrets outside the range are not attributed to it"
else bad "--range reported a file the range does not contain, or never walked a range (rc=$SUT_RC)" "$SUT_OUT"; fi

# 13. --tree: the push/full-audit source sees the whole tree, including files no
#     recent commit touched.
new_repo c13
build_xlsx book.xlsx "API key: $SECRET"
git add book.xlsx; git commit -qm "add xlsx" >/dev/null
printf 'text\n' > notes.md; git add notes.md; git commit -qm "unrelated" >/dev/null
run_sut_args --tree HEAD
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in book.xlsx" <<<"$SUT_OUT"; then
  ok "--tree: audits the whole tree, not just recent changes"
else bad "--tree missed a secret already in the tree (rc=$SUT_RC)" "$SUT_OUT"; fi

# 14. An UNRECOGNISED ARGUMENT MUST BE FATAL. This is the sharpest case here.
#     The pre-parameterisation script ignored every argument it did not expect, so
#     `--range A B` printed "no binary or document files staged" and exited 0 --
#     meaning the obvious way to wire this into CI produced a green check that had
#     enumerated nothing, in the reassuring words of a clean result. A gate that
#     silently ignores the flag telling it WHAT TO SCAN has the same defect as one
#     that scans zero bytes and calls it clean.
new_repo c14
build_xlsx book.xlsx "API key: $SECRET"
git add book.xlsx
run_sut_args --not-a-real-flag
if [ "$SUT_RC" -eq 2 ] && grep -q "unrecognised argument" <<<"$SUT_OUT"; then
  ok "unknown argument is fatal, never silently ignored"
else bad "unknown argument did not fail loudly (rc=$SUT_RC)" "$SUT_OUT"; fi

# 15. A BAD REF must fail closed. `git diff` against a ref that does not exist
#     errors, and an errored enumeration produces an empty list -- which reads
#     exactly like "nothing to scan" unless the failure is checked. Same shape as
#     the git-shim case the staged path already covers, reached the new way.
new_repo c15
git commit -qm "base" >/dev/null
run_sut_args --range 0000000000000000000000000000000000000000 HEAD
if [ "$SUT_RC" -ne 0 ] && grep -q "could not enumerate" <<<"$SUT_OUT"; then
  ok "--range with an unresolvable ref fails closed"
else bad "bad ref did not fail closed (rc=$SUT_RC)" "$SUT_OUT"; fi

# 16. A missing --config must be refused, not silently swapped for gitleaks'
#     built-in ruleset. That fallback still finds plenty and still exits 0 on a
#     clean file, so a typo'd path would scan with different coverage than
#     .gitleaks.toml documents and nothing in the output would say so.
new_repo c16
git commit -qm "base" >/dev/null
run_sut_args --tree HEAD --config "$WORK/definitely-not-here.toml"
if [ "$SUT_RC" -ne 0 ] && grep -q "cannot read gitleaks config" <<<"$SUT_OUT"; then
  ok "unreadable --config is refused"
else bad "missing --config was not refused (rc=$SUT_RC)" "$SUT_OUT"; fi

# 17. A ONE-SHOT --config must be refused. `--config <(git show base:.gitleaks.toml)`
#     is the obvious way to pass a config from another ref, and it fails in the worst
#     direction: the config is read several times here, the FIFO serves the first read
#     and returns EOF to the rest, so gitleaks parses an empty config, loads no rules
#     and exits 0. Found by hitting it while building the live test for this change --
#     a green "no leaks found" over a file that certainly had one.
new_repo c17
build_xlsx book.xlsx "API key: $SECRET"
git add book.xlsx; git commit -qm "add xlsx" >/dev/null
run_sut_args --tree HEAD --config <(cat "$SCRIPT_DIR/../.gitleaks.toml")
# Assert the CAUSE, not just a non-zero exit. The fixture in this repo CONTAINS the
# canary, so a run that got as far as scanning would also exit non-zero -- for the
# opposite reason. Without matching the diagnostic, this case passes whether the
# FIFO was refused or silently accepted, which is precisely the confusion it exists
# to detect.
if [ "$SUT_RC" -ne 0 ] \
   && grep -q "cannot read gitleaks config as a regular file" <<<"$SUT_OUT"; then
  ok "a one-shot (FIFO) --config is refused, not silently read empty"
else bad "FIFO --config was not refused by name (rc=$SUT_RC)" "$SUT_OUT"; fi

# 18. Empty --range operands must be refused. `--range "" HEAD` passes a bare count
#     check, and git reads `...HEAD` as HEAD...HEAD -- an empty diff, exit 0. This
#     is how an unset CI expression arrives: as an empty string, not as a missing
#     argument.
new_repo c18
build_xlsx book.xlsx "API key: $SECRET"
git add book.xlsx; git commit -qm "add xlsx" >/dev/null
run_sut_args --range "" HEAD
if [ "$SUT_RC" -eq 2 ] && grep -q "must both be non-empty" <<<"$SUT_OUT"; then
  ok "empty --range operand is refused, not read as HEAD...HEAD"
else bad "empty --range operand was accepted (rc=$SUT_RC)" "$SUT_OUT"; fi

# 19. --tree must enumerate the WHOLE tree from any working directory. `git ls-tree`
#     is cwd-sensitive in a way `git diff` is not: from a subdirectory it lists only
#     that subtree, so without --full-tree this scans a subset and reports it as the
#     whole tree. Measured: from `sub/`, `ls-tree -r HEAD` omitted the root file.
new_repo c19
mkdir -p sub
build_xlsx sub/deep.xlsx "API key: $SECRET"
git add sub/deep.xlsx; git commit -qm "secret in a subdirectory" >/dev/null
mkdir -p other
if SUT_OUT="$( cd other && "$SUT" --tree HEAD 2>&1 )"; then SUT_RC=0; else SUT_RC=$?; fi
if [ "$SUT_RC" -ne 0 ] && grep -qF "SECRET in sub/deep.xlsx" <<<"$SUT_OUT"; then
  ok "--tree scans the whole tree when run from a subdirectory"
else bad "--tree run from a subdirectory missed the secret (rc=$SUT_RC)" "$SUT_OUT"; fi

# 20/21. Enumeration failure must fail closed in EVERY mode, not only --range. A git
#     that exits non-zero writes nothing, and an empty file list is indistinguishable
#     from "nothing to scan" unless the exit status is checked. Simulated with a git
#     shim that fails only the enumerating subcommand, so the rest of the script
#     still reaches the point where it would report clean.
for mode in staged tree; do
  new_repo "c20-$mode"
  git commit -qm base >/dev/null
  mkdir -p "$WORK/gitstub-$mode"
  case "$mode" in
    staged) failing="diff" ;;
    tree)   failing="ls-tree" ;;
  esac
  # $(command -v git) is expanded HERE, at generation time, deliberately: resolving
  # it inside the stub would find the stub itself and recurse. The quotes around it
  # are literal in an unquoted heredoc, and they matter -- an unquoted git path
  # containing a space emits a stub that runs the wrong command, and the case then
  # fails for a reason that has nothing to do with enumeration.
  cat > "$WORK/gitstub-$mode/git" <<STUB
#!/bin/sh
for a in "\$@"; do
  [ "\$a" = "$failing" ] && exit 128
done
exec "$(command -v git)" "\$@"
STUB
  chmod +x "$WORK/gitstub-$mode/git"
  # An ARRAY, not `set --`. Rewriting \$@ here would rewrite it for the whole suite:
  # nothing reads arguments today, so it is invisible, but a later \$1 at the top of
  # this file would be silently destroyed by these two cases mid-run.
  # ${a[@]+"${a[@]}"} is the bash 3.2-safe empty-array expansion -- a bare
  # "${a[@]}" on an empty array is an unbound-variable error under `set -u` there.
  sut_args=()
  [ "$mode" = tree ] && sut_args=(--tree HEAD)
  if OUT="$(PATH="$WORK/gitstub-$mode:$PATH" "$SUT" "${sut_args[@]+"${sut_args[@]}"}" 2>&1)"; then
    RC=0
  else RC=$?; fi
  if [ "$RC" -ne 0 ] && grep -q "could not enumerate" <<<"$OUT"; then
    ok "$mode: a failed enumeration fails closed"
  else bad "$mode: failed enumeration did not fail closed (rc=$RC)" "$OUT"; fi
done

echo
echo "  $pass passed, $fail failed"
# ZERO CASES RUN IS NOT A PASS. `0 passed, 0 failed` exits 0 and reads exactly like a
# clean suite -- and it is reachable without anyone noticing: an early `return`, a
# fixture helper that aborts a subshell, a bad edit that drops the case block, a
# refactor that renames run_sut. lefthook and CI both read only the exit code, so the
# binary gate would report itself verified having asserted nothing. Same shape as the
# zero-assertion guard in #23 and as "scanned ~0 bytes" one layer down.
# EXACT, not a floor. This was a floor, and the floor was the weakness: a minimum of
# 20 against 25 cases let five disappear while the suite still reported success. A
# guard that tolerates loss cannot detect loss.
# Bumping this when you add a case is the point: it forces the change to be noticed.
_EXPECTED_CASES=25
_total=$((pass + fail))
if [ "$_total" -ne "$_EXPECTED_CASES" ]; then
  echo "  ✗ $_total case(s) ran, expected exactly $_EXPECTED_CASES"
  echo "      A suite that asserted less than it claims is UNKNOWN, not clean."
  echo "      If cases were added, bump _EXPECTED_CASES deliberately; if lost, that"
  echo "      is the regression this guard exists for."
  exit 1
fi
[ "$fail" -eq 0 ] || exit 1
