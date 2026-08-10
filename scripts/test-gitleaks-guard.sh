#!/usr/bin/env bash
# WHAT: proves the enforced gitleaks version behaves the way .gitleaks.toml documents.
#
# WHY: pinning a version only fixes WHICH binary runs. It does not tell you what that
#      binary does. The comment block in .gitleaks.toml makes four specific claims
#      about coverage; before this file existed, every one of them was a comment that
#      had been true once, on one machine, and could rot silently. Each claim is now
#      an assertion that fails loudly when it stops holding -- including the claims
#      about gaps, so that a future gitleaks CLOSING a hole also trips the test and
#      forces the comment to be corrected.
#
# No jq and no pytest on purpose: it must run identically at pre-push on a Mac and
# in the CI container. It DOES require python3, solely to validate that gitleaks'
# JSON report parsed before any assertion trusts it -- grep is not a JSON parser,
# and a truncated report with no matching fragment is indistinguishable from a
# clean one to grep. python3 is present on macOS and on ubuntu-latest, and its
# absence fails loudly below rather than quietly weakening the check. The sibling
# scripts/selftest-binary-scan.sh already requires it for the same class of reason.
#
# Usage:  scripts/test-gitleaks-guard.sh
# Exit:   0 all assertions passed · 1 one or more failed

# errexit ON: a failing fixture step (mkdir, write, chmod) must abort rather than
# let later assertions run against a half-built fixture and report a verdict about
# nothing. Every EXPECTED non-zero status in this file is already captured
# explicitly (`rc=0; cmd || rc=$?`) or tested inside an `if`, both of which errexit
# does not trip.
set -euo pipefail   # -e added deliberately: verified that a failing assertion still
                    # runs the rest and prints the total, because every expected
                    # non-zero status here is captured or tested inside an `if`.

# Detach from any inherited git context BEFORE the temp repo below is created.
#
# WHY: git exports GIT_DIR (an absolute path) into every hook it runs, and `git -C
# <tmpdir>` still honours it -- so inside the pre-push hook the "temp repo" staged its
# fixture into THIS repo's index and the staged scan found nothing. The test passed
# standalone and failed only on a real `git push`, which is the worst place to discover
# it. Caught because the staged assertions read the report instead of the exit code;
# on the exit code alone this would have been a silent false pass.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
      GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_PREFIX GIT_NAMESPACE

unset CDPATH   # a CDPATH entry would make the `cd`s below resolve somewhere else
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
GUARD="$SCRIPT_DIR/gitleaks-guard.sh"
CONFIG="$REPO_ROOT/.gitleaks.toml"
# Guarded exactly as gitleaks-guard.sh guards its own source, and for the same
# reason: sourcing a missing file aborts under `set -e` with a bare shell error
# naming neither this test nor the file it wanted. -f as well as -r because
# `[ -r ]` is true for a directory.
if [ ! -f "$SCRIPT_DIR/gitleaks-version.env" ] || [ ! -r "$SCRIPT_DIR/gitleaks-version.env" ]; then
  printf '\n✗ test-gitleaks-guard: cannot read %s\n\n' "$SCRIPT_DIR/gitleaks-version.env" >&2
  exit 1
fi
# shellcheck source=scripts/gitleaks-version.env
# shellcheck disable=SC1091  # resolved at runtime; the source= directive above covers -x runs
. "$SCRIPT_DIR/gitleaks-version.env"

# Precondition. Without this the missing-config case shows up as three unrelated
# assertion failures further down instead of one clear message.
[ -f "$CONFIG" ] || { printf '\n✗ no config at %s — nothing to test\n\n' "$CONFIG" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || {
  printf '\n✗ python3 not found — the JSON report cannot be validated, and an\n' >&2
  printf '  unvalidated report cannot be told apart from a clean one.\n\n' >&2
  exit 1
}

RUN=0 FAILED=0 SKIPPED=0

pass() { RUN=$((RUN + 1)); printf '  ✓ %s\n' "$1"; }
fail() { RUN=$((RUN + 1)); FAILED=$((FAILED + 1)); printf '  ✗ %s\n' "$1"; [ $# -lt 2 ] || printf '      %s\n' "$2"; }
skip() { SKIPPED=$((SKIPPED + 1)); printf '  – %s (SKIPPED: %s)\n' "$1" "$2"; }

# The fixture token has to satisfy two constraints at once: it must look like a secret
# to the scanner when written into a fixture FILE, and it must not look like one when
# read as a line of THIS file. Otherwise the repo's own pre-commit hook rejects the test
# and the only way to commit it is to allowlist this path in .gitleaks.toml -- punching a
# real hole in the config to accommodate a test.
#
# Two independent mechanisms are needed, because two different rules would fire:
#
#   1. Split prefix. `cr-` is stored apart from the body, so the literal the custom
#      coderabbit-api-key rule matches never appears in the source. That rule is pure
#      regex with no entropy threshold, so nothing else suppresses it.
#
#   2. Low-entropy body. Splitting alone is NOT enough, learned the hard way: the first
#      version of this file used a 32-char random hex body and was rejected on the first
#      commit by gitleaks' built-in generic-api-key rule (entropy 3.91) AND by the Aikido
#      pre-commit scanner. Both key off a high-entropy value near a credential-ish name.
#      A repeating body and a variable name with no credential keyword clear both.
#
# Both were re-verified against gitleaks and Aikido before this comment was written.
PROBE_HEAD='cr-'
PROBE_TAIL='fixture0fixture0fixture0'   # 24 chars: satisfies the rule's {20,}, ~3.0 bits/char
PROBE_VALUE="${PROBE_HEAD}${PROBE_TAIL}"

WORK=$(mktemp -d) || { echo "cannot create temp dir" >&2; exit 1; }
trap 'rm -rf "$WORK"' EXIT

# --- helpers ----------------------------------------------------------------

# Reject a report that is not well-formed JSON of the shape gitleaks writes.
#
# WHY this exists: grep is not a JSON parser. A readable but TRUNCATED report --
# a full disk, a killed scanner, a partial write -- can contain no matching
# "File" fragment at all, which the extraction below reads as "nothing flagged"
# and every expect_clean assertion then reports as a pass. Structure is checked
# before content, so a malformed report fails loudly instead of passing quietly.
validate_report() {
  python3 - "$1" <<'PYJSON' 2>/dev/null
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)                 # raises on malformed or truncated JSON
if not isinstance(data, list):           # gitleaks writes a JSON array
    raise SystemExit(1)
for item in data:
    if not isinstance(item, dict):
        raise SystemExit(1)
PYJSON
}

# scan <target-dir> <report-path> [extra gitleaks args...]
# Echoes the flagged paths, relative to the target dir, one per line.
scan() {
  local target="$1" report="$2" rc=0 raw grep_rc=0
  shift 2
  # --exit-code 0 makes "leaks found" exit 0, so a NON-ZERO status now means a
  # real error and nothing else. Measured on 8.30.1: findings -> rc 0 with a
  # report written; bad config -> rc 1 with no report. Without the flag both exit
  # 1, which is why this used to rely on the report's existence alone. Both
  # checks are kept because they catch different failures.
  #
  # Measured gap, stated so it is not rediscovered: a NONEXISTENT target still
  # exits 0 and writes an empty report. Every target here is built by this
  # script, so it cannot fire — do not reuse this helper on caller-supplied paths.
  "$GUARD" dir "$target" \
    --config "$CONFIG" --no-banner --log-level error --exit-code 0 \
    --report-format json --report-path "$report" "$@" >/dev/null 2>&1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    printf '\n✗ gitleaks exited %s scanning %s — with --exit-code 0 that is an\n' "$rc" "$target" >&2
    printf '  error, not findings. No assertion below can speak for .gitleaks.toml.\n\n' >&2
    exit 1
  fi
  if [ ! -f "$report" ]; then
    printf '\n✗ gitleaks produced no report for %s — the scan did not complete.\n\n' "$target" >&2
    exit 1
  fi
  if ! validate_report "$report"; then
    printf '\n✗ the report at %s is not valid gitleaks JSON — treating it\n' "$report" >&2
    printf '  as clean would be a false pass, so the run stops here.\n\n' >&2
    exit 1
  fi
  # Only grep status 1 (no matches) is a clean result. The blanket `|| true` this
  # replaces also swallowed sed/sort failures, and `2>/dev/null` hid grep's own
  # read errors — so an unreadable or truncated report became "nothing flagged",
  # which every expect_clean assertion reads as a pass.
  raw=$(grep -oE '"File":[[:space:]]*"[^"]*"' "$report") || grep_rc=$?
  if [ "$grep_rc" -gt 1 ]; then
    printf '\n✗ could not read the report at %s (grep exit %s)\n\n' "$report" "$grep_rc" >&2
    exit 1
  fi
  [ -n "$raw" ] || return 0
  # The prefix strip is a shell parameter expansion, NOT `sed "s|^${target}/||"`.
  # $target is a path, and interpolating a path into a sed program hands sed both a
  # delimiter and a regex: a `|` anywhere in it ends the s command, and `.` `*` `[`
  # change what matches. It is built from mktemp here, so it is safe today on this
  # machine -- but TMPDIR is caller-controlled, and the failure is silent and
  # ASYMMETRIC, which is what makes it worth removing rather than documenting. A
  # broken strip leaves absolute paths in the flagged set; expect_flagged still
  # matches (its glob is a substring test, and the absolute path contains the
  # relative one) while expect_clean sees a "flag" for every file. And a sed that
  # errors outright empties the set, which flips it the other way: every
  # expect_clean passes and the suite reports a clean config it never examined.
  # ${line#"$prefix"} has no regex semantics at all, so the class is gone.
  local _prefix="$target/" _line
  printf '%s\n' "$raw" \
    | sed -E 's/.*"File":[[:space:]]*"//; s/"$//' \
    | while IFS= read -r _line; do printf '%s\n' "${_line#"$_prefix"}"; done \
    | sort -u
}

# expect_flagged <label> <flagged-list> <path>
expect_flagged() {
  case $(printf '%s\n' "$2") in
    *"$3"*) pass "$1" ;;
    *)      fail "$1" "expected $3 to be flagged; flagged set was: $(printf '%s' "$2" | tr '\n' ' ')" ;;
  esac
}

# expect_clean <label> <flagged-list> <path>
expect_clean() {
  case $(printf '%s\n' "$2") in
    *"$3"*) fail "$1" "$3 was flagged; the documented behaviour in .gitleaks.toml is now WRONG and must be updated" ;;
    *)      pass "$1" ;;
  esac
}

# stub_gitleaks <dir> <version-string> — a fake gitleaks that only answers `version`
stub_gitleaks() {
  mkdir -p "$1"
  cat > "$1/gitleaks" <<EOF
#!/bin/sh
[ "\$1" = "version" ] && { echo "$2"; exit 0; }
echo "stub gitleaks: refusing to scan" >&2
exit 99
EOF
  chmod +x "$1/gitleaks"
}

# --- 1. the guard itself ----------------------------------------------------

printf '\ngitleaks-guard — version gate (floor %s)\n' "$GITLEAKS_MIN_VERSION"

if "$GUARD" >/dev/null 2>&1; then
  pass "accepts the installed gitleaks ($(gitleaks version 2>/dev/null | head -n1))"
else
  fail "accepts the installed gitleaks" "$("$GUARD" 2>&1 | tr '\n' ' ')"
fi

stub_gitleaks "$WORK/stub-old" '1.7.3'
if PATH="$WORK/stub-old:$PATH" "$GUARD" >/dev/null 2>&1; then
  fail "rejects a below-floor version (1.7.3)" "guard exited 0 on the exact version the review sandbox reported"
else
  pass "rejects a below-floor version (1.7.3)"
fi

stub_gitleaks "$WORK/stub-new" '9.99.0'
if PATH="$WORK/stub-new:$PATH" "$GUARD" >/dev/null 2>&1; then
  pass "accepts an above-floor version (9.99.0)"
else
  fail "accepts an above-floor version (9.99.0)" "floor comparison is too strict"
fi

stub_gitleaks "$WORK/stub-junk" 'gitleaks: unknown build'
if PATH="$WORK/stub-junk:$PATH" "$GUARD" >/dev/null 2>&1; then
  fail "fails closed on unparseable version output" "guard proceeded with an unidentified binary"
else
  pass "fails closed on unparseable version output"
fi

MINIMAL_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
if PATH="$MINIMAL_PATH" command -v gitleaks >/dev/null 2>&1; then
  skip "errors when gitleaks is absent" "gitleaks is installed inside $MINIMAL_PATH here"
elif PATH="$MINIMAL_PATH" "$GUARD" >/dev/null 2>&1; then
  fail "errors when gitleaks is absent" "guard exited 0 with no scanner available"
else
  pass "errors when gitleaks is absent"
fi

# --- 2. documented scan coverage --------------------------------------------
#
# Each assertion below corresponds to a specific claim in the .gitleaks.toml comment
# block. Keep them in sync: if you change one, change the other.

printf '\n.gitleaks.toml — documented coverage\n'

# A value that appears NOWHERE else, so finding it in a redacted report is
# unambiguous evidence the report leaked it.
REDACT_PROBE="Zq7Wm3Pl9Kx2Nb5Vt8Yr"

FIX="$WORK/fixtures"
mkdir -p "$FIX/plain" "$FIX/tests/fixtures"
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/probe.txt"
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/probe.md"
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/probe.pdf"
# PAIR, in the same shape as the $env: pair below, and for the same reason.
# placeholder.txt is a REAL token with the word "example" stuck on the end. It used to
# be asserted CLEAN, which encoded the belief that a credential stops being one when a
# placeholder word appears anywhere inside it. It does not, and the unanchored
# allowlist regexes suppressed exactly this: measured against gitleaks' own default
# rules, two of three real GitHub PATs were silently exempted for containing
# `example` / `xxxx`. Now flagged.
# placeholder-exact.txt keeps the legitimate half honest: a value that IS the
# placeholder stays suppressed, so anchoring cannot be "fixed" by deleting the
# exemption altogether.
printf 'api_key = "%sexample"\n' "$PROBE_VALUE"   > "$FIX/plain/placeholder.txt"
printf 'api_key = "example"\n'                    > "$FIX/plain/placeholder-exact.txt"
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/tests/fixtures/probe.txt"
# Regression pair for the image path exclusion. `mexico` ends in the letters "ico"
# but is not an image; before the pattern was anchored to a literal dot it was
# silently excluded from scanning. probe.png holds the other direction so a future
# "fix" cannot pass by simply dropping the exclusion. See .gitleaks.toml.
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/mexico"
# THE UNLISTED-EXTENSION CONTRACT, made checkable instead of assumed.
# scan-staged-binaries.sh routes only the extensions in its four buckets and lets
# everything else fall through with the comment "anything else is text AND not
# path-skipped, so the primary gate already read it". That is TRUE TODAY -- probed on
# 8.30.1 across .sqlite/.db/.parquet/.bak/.unknownext, all flagged by the primary
# scan -- and it is true only because gitleaks' BUILT-IN path allowlist does not list
# them. Nothing in either file notices if a future gitleaks adds one: the primary gate
# would start skipping it by path, the binary scanner would still not route it, and it
# would be covered by neither. That is precisely how .svg was missed twice.
# This fixture turns that silent double-miss into a failing assertion.
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/store.sqlite"
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/probe.png"
# Uppercase counterpart. The anchored pattern carries (?i), which is a widening:
# PHOTO.PNG was scanned before and is not now. Without this fixture, dropping
# (?i) would pass every assertion in this file while silently changing coverage.
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/PHOTO.PNG"

# .lock regression. The blanket `(.*?)\.lock$` exclusion was removed after
# measuring that it suppressed nothing across the fleet -- but the glob matched
# ANY path ending in .lock, so `credentials.lock` was exempt too. Without a
# fixture, re-adding the exclusion would pass every assertion in this file.
printf 'api_key = "%s"\n' "$PROBE_VALUE"          > "$FIX/plain/credentials.lock"

# Anchored $env: allowlist, both directions. An EXACT reference is not a secret
# and must stay suppressed; a value merely CONTAINING one is a secret wearing a
# reference as a prefix, and the unanchored pattern exempted it. One fixture
# each, because a single-direction test passes under either pattern.
printf 'token = "$env:GITHUB_TOKEN"\n'            > "$FIX/plain/envref.txt"
printf 'token = "$env:X%s"\n' "$PROBE_VALUE"      > "$FIX/plain/envprefix.txt"

# Redaction regression. Both these rules once reported the CREDENTIAL in their
# --redact output: powershell-plaintext-password captured the variable NAME, and
# vsphere-credential-literal had no capture group at all, so the whole line was
# the "secret". The assertions below check the redacted REPORT, not just that the
# rule fires -- a rule can fire correctly and still print the password.
printf '$password = "%s"\n' "$REDACT_PROBE"       > "$FIX/plain/ps_secret.ps1"
printf 'Connect-VIServer -Server vc01 -Password "%s"\n' "$REDACT_PROBE" > "$FIX/plain/vsphere.ps1"

# scan() aborts inside a command substitution, which ends only the SUBSHELL --
# the status is what reaches here, so it must be checked or the abort is inert.
FLAGGED=$(scan "$FIX" "$WORK/report-full.json") || exit 1

expect_flagged "flags a coderabbit token in .txt"                 "$FLAGGED" "plain/probe.txt"
expect_flagged "flags a coderabbit token in .md"                  "$FLAGGED" "plain/probe.md"
expect_flagged "a real token merely CONTAINING 'example' is still flagged" "$FLAGGED" "plain/placeholder.txt"
expect_clean   "a value that IS the placeholder stays suppressed"  "$FLAGGED" "plain/placeholder-exact.txt"

# Both directions of the image exclusion. The first is the regression: it FAILED before
# the pattern carried a literal dot, and it fails again the moment someone removes one.
expect_flagged "non-image path ending in 'ico' is still scanned"  "$FLAGGED" "plain/mexico"
expect_flagged "an extension in NO scan-staged-binaries bucket is covered by the primary gate" \
               "$FLAGGED" "plain/store.sqlite"
expect_flagged "a secret in a .lock file is scanned (no blanket exclusion)" "$FLAGGED" "plain/credentials.lock"
expect_clean   "an exact \$env: reference stays suppressed"        "$FLAGGED" "plain/envref.txt"
expect_flagged "a secret merely PREFIXED by \$env: is still flagged" "$FLAGGED" "plain/envprefix.txt"

# Firing is necessary but not sufficient: a rule can match correctly and still
# PRINT the credential. This needs its own scan, because scan() above runs
# WITHOUT --redact -- its report is expected to contain values, so asserting
# against it would have tested nothing (and did, on the first attempt).
scan "$FIX" "$WORK/report-redacted.json" --redact >/dev/null || exit 1
# grep's exit codes: 0 match, 1 no match, >1 ERROR (unreadable file, bad args).
# The first version sent every non-zero to pass, so a report grep could not READ
# counted as "no leak found" -- the scanned-nothing-reads-clean shape, in the
# assertion built to catch a redaction bug. Each status gets its own branch.
# -F like the identifier greps below: the probe is alphanumeric today, but a
# regex-quiet match should not depend on the constant staying metacharacter-free.
_g=0; grep -qF "$REDACT_PROBE" "$WORK/report-redacted.json" || _g=$?
if [ "$_g" -eq 0 ]; then
  fail "--redact report LEAKS the credential value (check secretGroup on the custom rules)"
elif [ "$_g" -eq 1 ]; then
  pass "--redact report does not contain the credential value"
else
  fail "could not inspect the redacted report (grep exit $_g) — this proves nothing"
fi
# Absence of the value is necessary but not sufficient: a WHOLE-MATCH redaction
# also removes the probe while masking the identifier too, and would pass the
# check above. The contract is "identifier preserved, value replaced" -- assert
# the preserved half explicitly, one identifier per rule under test.
# '$password' WITH the dollar sign, not 'password': the RuleID
# "powershell-plaintext-password" contains the bare word, so a bare-word grep
# matches the report regardless of what redaction did -- the assertion would be
# non-discriminating, which is the defect it was added to close.
for _ident in '$password' 'Connect-VIServer'; do
  _g=0; grep -qF "$_ident" "$WORK/report-redacted.json" || _g=$?
  if [ "$_g" -eq 0 ]; then
    pass "redacted report preserves the '$_ident' identifier"
  elif [ "$_g" -eq 1 ]; then
    fail "redacted report lost the '$_ident' identifier — whole-match redaction regressed"
  else
    fail "could not inspect the redacted report (grep exit $_g) — this proves nothing"
  fi
done

# WHICH RULE FIRED, not merely that the identifier survived. The greps above prove a
# string is present in the report; they cannot prove the CUSTOM rule produced it. A
# built-in rule matching the same fixture would leave both identifiers in place and
# every assertion above would still pass -- the same non-discriminating shape the
# '$password' comment describes, one level up. That matters here specifically because
# these two rules carry the secretGroup that makes --redact mask the VALUE rather than
# the variable name: if a built-in rule is silently doing the work, the redaction
# contract this section exists to guard is not actually being tested.
#
# Related, and the reason a sentinel must never be built on a sequential token:
# gitleaks' BUILT-IN stopwords suppress alphabet runs. Measured on 8.30.1 --
# `ghp_abcdefghij...` is NOT reported by the default ruleset while a random-looking
# token of the same shape IS. The kit's canaries survive only because they match the
# custom coderabbit-api-key rule; anything pointed at a default rule would go quietly
# green. Asserting the RuleID is what turns that from luck into a checked property.
for _rule in vsphere-credential-literal powershell-plaintext-password; do
  _n=$(jq -r --arg r "$_rule" '[.[] | select(.RuleID == $r)] | length' \
         "$WORK/report-redacted.json" 2>/dev/null || echo ERR)
  case "$_n" in
    ERR|"") fail "could not read RuleID '$_rule' from the report — this proves nothing" ;;
    0)      fail "no finding carries RuleID '$_rule' — a different rule is doing this work" ;;
    *)      pass "redaction fixture is matched by RuleID '$_rule' ($_n finding(s))" ;;
  esac
done
expect_clean   "real image extensions stay excluded"              "$FLAGGED" "plain/probe.png"
expect_clean   "uppercase image extensions stay excluded ((?i))"  "$FLAGGED" "plain/PHOTO.PNG"

# Characterisation of KNOWN GAPS. These assert that a hole is still open. If one starts
# failing, that is good news badly delivered: the gap closed, and .gitleaks.toml's
# STANDING LIMIT paragraph is now overstating the risk. Update the comment, then flip
# the assertion.
# Scope note: this asserts what GITLEAKS-WITH-THIS-CONFIG does, which is the only thing
# .gitleaks.toml can speak for. It is NOT a claim that PDFs go unscanned in this repo --
# scripts/scan-staged-binaries.sh covers them at pre-commit by routing around this very
# exclusion. The two are consistent: that script works by changing the path gitleaks sees,
# so the exclusion asserted here is exactly the thing it exists to defeat, and this
# assertion is what tells you if the ground it stands on ever shifts.
expect_clean "gitleaks still skips .pdf by path (what scan-staged-binaries.sh routes around)" \
  "$FLAGGED" "plain/probe.pdf"
expect_clean "KNOWN GAP: tests/fixtures/ is skipped (this repo's allowlist paths)" \
  "$FLAGGED" "tests/fixtures/probe.txt"

# Isolate the custom rule, so a pass above cannot be produced by a DIFFERENT rule.
#
# Verified 2026-08-08, and the result depends on the fixture token, which is worth
# recording precisely:
#   - With a high-entropy body (the 32-hex one this file originally used), deleting the
#     coderabbit-api-key rule left every assertion above still green -- gitleaks' built-in
#     `generic-api-key` caught the same string. The test would have passed with the rule
#     it exists to check completely dead.
#   - With the current low-entropy body, generic-api-key no longer fires, so deleting the
#     rule now fails the other assertions too.
# The isolation assertion is kept because that safety is a side effect of one property of
# the token. Anyone who raises the body's entropy silently restores the masking; this
# assertion is what stops that from going unnoticed.
#
# --enable-rule was checked in the same pass to confirm it is not silently ignored:
# `--enable-rule no-such-rule-xyz` returns zero findings, so a pass here means the named
# rule really fired.
ISOLATED=$(scan "$FIX" "$WORK/report-isolated.json" --enable-rule coderabbit-api-key) || exit 1
expect_flagged "the custom coderabbit-api-key rule fires on its own" "$ISOLATED" "plain/probe.txt"

# --- 3. the invocation lefthook actually runs -------------------------------
#
# The assertions above scan a directory. The pre-commit gate scans the git INDEX, which
# is a different code path in gitleaks. Test the thing that actually guards the repo.
#
# NOTE these assert on the REPORT CONTENTS, not on the exit code. gitleaks exits
# non-zero both when it finds a leak and when it fails to run at all, so "exited 1"
# is not evidence of detection. An earlier draft of this file used the exit code and
# reported "✓ blocks a staged secret" during a deliberate mutation run in which the
# config was missing and nothing had been scanned.

printf '\nlefthook pre-commit path — staged-file scan\n'

# staged_scan <report> — runs the pre-commit invocation, echoes the rule IDs found
staged_scan() {
  local rc=0 raw grep_rc=0
  # Same contract as scan(): --exit-code 0 so a non-zero status means an error.
  ( cd "$STAGE" && "$GUARD" git --staged --redact --no-banner --log-level error --exit-code 0 \
      --report-format json --report-path "$1" >/dev/null 2>&1 ) || rc=$?
  if [ "$rc" -ne 0 ]; then
    printf '\n✗ gitleaks exited %s on the staged scan — an error, not findings.\n\n' "$rc" >&2
    exit 1
  fi
  if [ ! -f "$1" ]; then
    printf '\n✗ gitleaks produced no staged report — the scan did not run.\n' >&2
    printf '  The staged assertions below would prove nothing.\n\n' >&2
    exit 1
  fi
  if ! validate_report "$1"; then
    printf '\n✗ the report at %s is not valid gitleaks JSON — treating it\n' "$1" >&2
    printf '  as clean would be a false pass, so the run stops here.\n\n' >&2
    exit 1
  fi
  raw=$(grep -oE '"RuleID":[[:space:]]*"[^"]*"' "$1") || grep_rc=$?
  if [ "$grep_rc" -gt 1 ]; then
    printf '\n✗ could not read the staged report at %s (grep exit %s)\n\n' "$1" "$grep_rc" >&2
    exit 1
  fi
  [ -n "$raw" ] || return 0
  printf '%s\n' "$raw" | sed -E 's/.*"RuleID":[[:space:]]*"//; s/"$//' | sort -u
}

STAGE="$WORK/staged"
mkdir -p "$STAGE"
# STALE CLAIM CORRECTED: `set -e` is ON in this file (line 28, `set -euo pipefail`,
# added deliberately and verified there). It was off when this paragraph was written
# and the sentence outlived the change -- which matters more than a wrong comment
# usually does, because the explicit `|| { ...exit 1; }` guards below exist to
# compensate for its ABSENCE. A reader trusting this comment would conclude they are
# load-bearing when errexit already covers the abort; a reader trusting the code
# might delete them. They stay, and the reason is now the honest one: errexit aborts,
# but ANONYMOUSLY, and these setup commands discard stdout to keep the output
# readable. A failing git command would otherwise surface as the assertion message
# below -- "the staged scan produced NO findings" -- pointing the reader at the
# scanner when the cause was git. This file exists because an earlier draft could not
# distinguish those two states; its own setup must not repeat the mistake.
git -C "$STAGE" init -q 2>/dev/null \
  || { printf '\n✗ could not init the temp repo at %s — the suite never ran\n\n' "$STAGE" >&2; exit 1; }

# Same guard as scripts/selftest-binary-scan.sh, for the same reason: with an ambient
# GIT_DIR, `git init` re-initialises THAT repo instead of creating one here. Verified
# destructive on 2026-08-08 -- it wrote core.bare=true into the shared config mid-push.
STAGE_ROOT=$(git -C "$STAGE" rev-parse --show-toplevel 2>/dev/null || echo '')
if [ "$STAGE_ROOT" != "$(cd "$STAGE" && pwd -P)" ]; then
  printf '\n✗ temp repo resolved to %s, not %s — an ambient GIT_DIR is leaking in\n\n' \
    "${STAGE_ROOT:-<none>}" "$STAGE" >&2
  exit 1
fi
# Setup failures below EXIT rather than record-and-continue. Recording keeps
# the run going with a temp repo that is not in the state the next assertion
# assumes, so that assertion's verdict describes the broken setup rather than
# the scanner — the wrong-cause reporting this file exists to prevent, and the
# same reason `scan()` aborts instead of returning an empty list.
cp "$CONFIG" "$STAGE/.gitleaks.toml" \
  || { printf '\n✗ could not copy the config into the temp repo — the staged assertions cannot run\n\n' >&2; exit 1; }
printf 'api_key = "%s"\n' "$PROBE_VALUE" > "$STAGE/leak.txt"
git -C "$STAGE" add leak.txt \
  || { printf '\n✗ could not stage the leak fixture — the scanner was never exercised\n\n' >&2; exit 1; }

RULES=$(staged_scan "$WORK/report-staged-leak.json") || exit 1
case $(printf '%s\n' "$RULES") in
  *coderabbit-api-key*) pass "blocks a staged secret (rule: coderabbit-api-key)" ;;
  '')                   fail "blocks a staged secret" "the staged scan produced NO findings — it detected nothing, which is not the same as finding nothing" ;;
  *)                    fail "blocks a staged secret" "flagged, but by the wrong rule: $(printf '%s' "$RULES" | tr '\n' ' ')" ;;
esac

git -C "$STAGE" rm -q --cached leak.txt \
  || { printf '\n✗ could not unstage the leak fixture — the next assertion would scan the wrong index\n\n' >&2; exit 1; }
rm -f "$STAGE/leak.txt"
printf 'nothing to see here\n' > "$STAGE/clean.txt"
git -C "$STAGE" add clean.txt \
  || { printf '\n✗ could not stage the clean fixture — the scanner was never exercised\n\n' >&2; exit 1; }

CLEAN_RULES=$(staged_scan "$WORK/report-staged-clean.json") || exit 1
if [ -z "$CLEAN_RULES" ]; then
  pass "passes a clean staged file"
else
  fail "passes a clean staged file" "false positive on benign content — this is how a gate becomes a habit of bypassing it"
fi

# --- report -----------------------------------------------------------------

printf '\n%s assertions run, %s failed, %s skipped\n' "$RUN" "$FAILED" "$SKIPPED"
# A suite that ran NOTHING is not a suite that passed. Without this, an early
# `continue`/skip path or a future refactor that stops registering cases prints
# the green line over zero evidence -- the same fail-open this file exists to
# catch, in the file that catches it.
if [ "$RUN" -eq 0 ]; then
  printf '\n✗ no assertions ran — the self-test inspected nothing, which is UNKNOWN, not clean.\n\n'
  exit 1
fi
if [ "$FAILED" -ne 0 ]; then
  printf '\n✗ gitleaks does not behave as .gitleaks.toml documents. Fix the config or the comment — do not delete the test.\n\n'
  exit 1
fi
printf '✓ gitleaks %s behaves as documented\n\n' "$(gitleaks version 2>/dev/null | head -n1)"
