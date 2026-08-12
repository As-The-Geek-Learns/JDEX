#!/usr/bin/env bash
# WHAT: Self-test for scripts/check-big-files.sh.
#
# WHY:  no-big-files was wrong in four distinct ways in one day, and THREE of them
#       were introduced while fixing the previous one:
#         - measured the working tree, not the staged blob  -> blocked symlinks and
#           git-lfs pointers, telling you to "use LFS" about an LFS file
#         - took lefthook's {staged_files}                  -> stage large, rm it, and
#           the blob commits while the job reports "skip, no files"
#         - --diff-filter=ACMR                              -> symlink in HEAD replaced
#           by a large regular file is status T, no record emitted at all
#         - truncating message                              -> a blob one byte over
#           reported "is 5MB" against a "5MB" limit
#       Every one passed casual reading. That is the profile of code that needs a
#       test rather than a careful reviewer.
#
# THE CONTROL IS THE POINT. Most shapes below pass on a BROKEN check for one reason
# or another — in the original round, the symlink case was the only one of six that
# distinguished the old logic from the first fix. So this suite is run against a
# deliberately unfixed copy too (see --self-check), and a suite whose control passes
# is reporting nothing.
#
# Run:  scripts/selftest-no-big-files.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="${SUT_OVERRIDE:-$SCRIPT_DIR/check-big-files.sh}"

# --self-check: run this suite against a DELIBERATELY BROKEN checker and require it
# to fail. #12's central point is that a suite with no failing control proves
# nothing — most shapes here pass on a broken hook for one reason or another, and in
# the original round only one case of six distinguished the old logic from the first
# fix. Running that control by hand is how it stops being run, so it ships.
#
# The broken implementation is the ORIGINAL defect, not an arbitrary mutation: it
# takes its paths from the working tree rather than the index, which is exactly what
# let "stage large, delete, blob commits" through.
# Unknown arguments are FATAL, the same contract scan-staged-binaries.sh states
# and for the same reason: `selftest-no-big-files.sh --self-chekc` (typo'd) ran
# the NORMAL suite and reported success — a green that claims the control ran
# when nothing of the kind happened. An ignored argument that changes WHAT WAS
# TESTED is the same defect as an ignored flag that changes what was scanned.
#
# The ARITY is checked, not just $1. A first version tested only the first
# argument, so `--self-check --typo` ran the control and reported it green --
# reintroducing the very defect this guard was added for, one argument to the
# right. The accepted forms are exactly two: no arguments, or a single
# --self-check.
if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "${1:-}" != --self-check ]; }; then
  echo "✗ selftest-no-big-files: unrecognised argument(s): $*" >&2
  echo "    Usage: selftest-no-big-files.sh [--self-check]   (no other form)" >&2
  echo "    Refusing to run — an ignored argument here means reporting on the wrong test." >&2
  exit 2
fi
if [ "${1:-}" = --self-check ]; then
  _broken=$(mktemp)
  trap 'rm -f "$_broken"' EXIT
  cat > "$_broken" <<'BROKEN'
#!/usr/bin/env bash
# Deliberately broken: enumerates the WORKING TREE, so anything staged-but-absent
# (or staged-then-shrunk) is invisible. This is the original no-big-files defect.
set -euo pipefail
LIMIT="${BIG_FILE_LIMIT:-5242880}"
for f in $(git diff --cached --name-only --diff-filter=ACMRT 2>/dev/null); do
  [ -f "$f" ] || continue
  size=$(wc -c < "$f" | tr -d ' ')
  if [ "$size" -gt "$LIMIT" ]; then
    printf '✗ %s is %s bytes, over the %s byte limit\n' "$f" "$size" "$LIMIT"
    exit 1
  fi
done
BROKEN
  chmod +x "$_broken"
  # `bash "$0"`, and the exit status is CLASSIFIED rather than tested for truthiness.
  # Both halves were wrong: invoking "$0" directly on a copy without the execute bit
  # returns 126, and `if <that>; then fail; fi` treats 126 as "did not pass" — so the
  # control printed "the suite fails against a known-broken checker, as it must"
  # having never run the suite at all. Reproduced with `chmod -x` on a copy: exit 0,
  # success message, nothing executed. That is precisely the failure this whole file
  # exists to detect, reproduced inside the check written to detect it.
  #
  # So: only rc=1 (assertions failed) counts as the control working. 0 means the
  # suite passed against a broken checker; anything else means it could not run,
  # which is UNKNOWN and must never read as success.
  _rc=0
  SUT_OVERRIDE="$_broken" bash "$0" >/dev/null 2>&1 || _rc=$?
  case "$_rc" in
    1) echo "✓ self-check: the suite fails against a known-broken checker, as it must"
       exit 0 ;;
    0) echo "✗ SELF-CHECK FAILED: the suite PASSED against a known-broken checker."
       echo "    It is not discriminating, so a green run tells you nothing."
       exit 1 ;;
    *) echo "✗ SELF-CHECK COULD NOT RUN (exit $_rc)."
       echo "    The control never executed, so it proves nothing either way."
       exit 1 ;;
  esac
fi

# Same GIT_DIR detachment as selftest-binary-scan.sh, for the same reason: git exports
# GIT_DIR into every hook it runs, and `git init` under an inherited GIT_DIR
# RE-INITIALISES the outer repository instead of creating a new one.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
      GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_COMMON_DIR GIT_PREFIX GIT_NAMESPACE

# Small limit, real fixtures. Writing 5 MB per case would make the suite slow enough
# that people stop running it, and the limit's VALUE is not what is under test — the
# enumeration and measurement are.
LIMIT=1024
export BIG_FILE_LIMIT="$LIMIT"

pass=0; fail=0
ok()  { pass=$((pass+1)); echo "  ✓ $1"; }
# The trailing `[ -n ] && ...` was the function's LAST command: with no second
# argument the test is false, the function returns 1, and errexit killed the
# whole suite at its first one-argument bad() — a reporter that aborts the
# report. The if-form returns 0 either way.
# shellcheck disable=SC2001  # prefixing EVERY line needs sed; ${x//a/b} cannot. (Same directive as the sibling suite.)
bad() { fail=$((fail+1)); echo "  ✗ $1"; if [ -n "${2:-}" ]; then echo "$2" | sed 's/^/        /'; fi; }

# For fixture SETUP failures, as distinct from assertion failures.
#
# WHY a separate function: the two say different things. bad() means the system
# under test was exercised and behaved wrongly. This means the SUT was never
# reached, so the case proves nothing either way -- calling that "failed" claims
# more than the run earned, and calling it "passed" is the silent-skip defect
# this suite exists to catch.
#
# It sets FIXTURE_OK=0 rather than only counting, because returning 0 (which it
# must, to avoid tripping errexit as the final command of an `|| ...` list) let
# execution FALL THROUGH into the case's run_sut/expect. That produced a second,
# meaningless assertion stacked on top of the setup failure -- an "expected PASS,
# got block" verdict about a fixture that was never built. The caller now guards
# the assertion on FIXTURE_OK, so a broken fixture reports once and skips.
FIXTURE_OK=1
fixture_fatal() {
  fail=$((fail+1))
  FIXTURE_OK=0
  echo "  ✗ FIXTURE: $1 (case unproven — the SUT was not exercised)"
  return 0
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

new_repo() {
  local d="$WORK/$1"; mkdir -p "$d"; cd "$d"
  # BEFORE `git init`, not after: init.templateDir and init.defaultBranch are read
  # BY init, and a templateDir can install hooks that fire on every fixture commit
  # below. Isolating afterwards leaves open the window the isolation exists to close.
  # (Raised on selftest-binary-scan.sh in #38; this file inherited the same ordering.)
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  git init -q .
  local root; root="$(git rev-parse --show-toplevel 2>/dev/null || echo '')"
  if [ "$root" != "$(pwd -P)" ]; then
    echo "FATAL: temp repo resolved to '${root:-<none>}' — an ambient GIT_DIR is leaking in." >&2
    exit 1
  fi
  git config --local user.email t@t.t; git config --local user.name t
}

big()   { head -c $((LIMIT + 512)) /dev/zero | tr '\0' 'A' > "$1"; }
small() { head -c 16 /dev/zero | tr '\0' 'a' > "$1"; }
exact() { head -c "$LIMIT" /dev/zero | tr '\0' 'A' > "$1"; }
over1() { head -c $((LIMIT + 1)) /dev/zero | tr '\0' 'A' > "$1"; }

# `bash "$SUT"`, matching how lefthook.yml invokes the checker. Executing "$SUT"
# directly requires the execute bit; if that bit drops, the direct call returns
# 126 while the hook (which never needed the bit) keeps working -- so the suite
# would be testing an invocation the gate does not use, and failing on a
# property the gate deliberately does not depend on.
run_sut() { if OUT="$(bash "$SUT" 2>&1)"; then RC=0; else RC=$?; fi; }

# expect <label> <BLOCK|PASS>
expect() {
  local label="$1" want="$2"
  # BLOCK means "the gate examined the input and refused it" — exit 1, and only 1.
  # The old `BLOCK:*` arm accepted ANY non-zero, so a checker that could not run
  # at all (exit 2, 127...) counted as a successful block: "the check never ran"
  # scored as "the check worked". Same shape the checker itself refuses.
  case "$want:$RC" in
    BLOCK:0) bad "$label — expected BLOCK, got pass" "$OUT" ;;
    BLOCK:1) ok  "$label" ;;
    BLOCK:*) bad "$label — checker did not RUN (rc=$RC); that is not a block" "$OUT" ;;
    PASS:0)  ok  "$label" ;;
    PASS:1)  bad "$label — expected pass, got block" "$OUT" ;;
    PASS:*)  bad "$label — checker did not RUN (rc=$RC); that is not a pass" "$OUT" ;;
  esac
}

echo "check-big-files.sh self-test  (limit=${LIMIT}B)"

new_repo c1;  big oversized.bin;  git add oversized.bin;              run_sut; expect "plain oversized blob" BLOCK
new_repo c2;  small ok.txt;       git add ok.txt;                     run_sut; expect "small file" PASS

# THE {staged_files} CASES. Both of these commit the blob while lefthook filters the
# path out of {staged_files} entirely, so the job would report "skip, no files".
new_repo c3;  big f.bin; git add f.bin; small f.bin;                  run_sut; expect "stage large, then SHRINK worktree" BLOCK
new_repo c4;  big f.bin; git add f.bin; rm f.bin;                     run_sut; expect "stage large, then DELETE worktree" BLOCK

# MEASUREMENT-SOURCE CASES. The blob is a short path string; only a check that sizes
# the worktree target would call these oversized.
new_repo c5;  big target.bin; ln -s target.bin link; git add link;    run_sut; expect "symlink to a large target" PASS

# TYPE CHANGES (status T). Invisible to --diff-filter=ACMR.
new_repo c6;  ln -s /etc/hosts f; git add f; git commit -qm base >/dev/null
              rm f; big f; git add f;                                 run_sut; expect "symlink in HEAD -> large regular file (T)" BLOCK
new_repo c7;  big f; git add f; git commit -qm base >/dev/null
              rm f; ln -s /etc/hosts f; git add f;                    run_sut; expect "large regular file -> symlink (T)" PASS

# GITLINKS. mode 160000; the sha names a commit in another repo, which this one does
# not have. Unguarded, cat-file fails and errexit kills the hook BEFORE any later
# file is checked — so the ordering in c9 is the case that matters.
new_repo c8
  FIXTURE_OK=1
  # The subshell's status is CHECKED, not discarded: a bare `( ... )` that fails
  # trips errexit, the EXIT trap deletes $WORK, and the suite dies with no
  # diagnostic — while a subshell that "succeeds" without being checked leaves
  # the failure to surface three lines later as a submodule-add error blamed on
  # the wrong step. Named cause, then skip: the source repo IS the fixture.
  if ! ( mkdir -p "$WORK/sub" && cd "$WORK/sub" && git init -q . \
    && git config --local user.email t@t.t && git config --local user.name t \
    && echo x > a && git add a && git commit -qm s >/dev/null ) 2>/dev/null; then
    fixture_fatal "c8: could not build the sub-repository"
  fi
  # NO `|| true`. Suppressing this leaves c8 with no gitlink at all, so the case
  # passes without ever exercising the guard it exists for -- a fixture that proves
  # nothing while reporting a tick. A setup failure is a suite failure.
  # Guarded on FIXTURE_OK like every later step: a source repo that failed to
  # build must report ONCE, not once per downstream consequence.
  if [ "$FIXTURE_OK" = 1 ]; then
    git -c protocol.file.allow=always submodule add -q "$WORK/sub" sub 2>/dev/null \
      || { fixture_fatal "c8: could not stage a gitlink"; }
  fi
  # Guarded: an already-failed fixture must report ONCE. fixture_fatal returns 0,
  # so an unguarded second check double-counts one failure and the case-count
  # guard then blames added/lost cases — the wrong cause, in the file written to
  # stop wrong causes.
  if [ "$FIXTURE_OK" = 1 ]; then
    git ls-files -s sub | grep -q '^160000' \
      || fixture_fatal "c8: no gitlink in the index"
  fi
  if [ "$FIXTURE_OK" = 1 ]; then run_sut; expect "gitlink submodule alone" PASS
  else echo "  – skipped: gitlink submodule alone (fixture failed above)"; fi
new_repo c9
  FIXTURE_OK=1
  # Same checked-subshell + FIXTURE_OK guard as c8, for the same two reasons.
  if ! ( mkdir -p "$WORK/sub2" && cd "$WORK/sub2" && git init -q . \
    && git config --local user.email t@t.t && git config --local user.name t \
    && echo x > a && git add a && git commit -qm s >/dev/null ) 2>/dev/null; then
    fixture_fatal "c9: could not build the sub-repository"
  fi
  # NOTE for reviewers: `$WORK/sub2` is the SOURCE repository; the gitlink is
  # staged at path `sub` (the second operand), which is what the ls-files check
  # below inspects. Two review rounds have read the source dir as the path.
  if [ "$FIXTURE_OK" = 1 ]; then
    git -c protocol.file.allow=always submodule add -q "$WORK/sub2" sub 2>/dev/null \
      || { fixture_fatal "c9: could not stage a gitlink"; }
  fi
  # Guarded for the same reason as c8 above: one fixture failure, one report.
  if [ "$FIXTURE_OK" = 1 ]; then
    git ls-files -s sub | grep -q '^160000' \
      || fixture_fatal "c9: no gitlink in the index"
  fi
  big after.bin; git add after.bin
  # The block must NAME after.bin. expect() alone accepts any exit-1, so a
  # checker refusing for an unrelated reason (a gitlink mis-skip, say) would
  # count as this case passing — the assertion exists to prove the file staged
  # AFTER the gitlink was reached and measured, so pin it to the message.
  if [ "$FIXTURE_OK" = 1 ]; then
    run_sut
    if [ "$RC" -eq 1 ] && grep -qF 'after.bin' <<<"$OUT"; then
      ok "gitlink does not mask a large file staged after it (after.bin named)"
    else
      bad "gitlink case: expected a block NAMING after.bin (rc=$RC)" "$OUT"
    fi
  else echo "  – skipped: gitlink does not mask a large file (fixture failed above)"; fi

# INTENT-TO-ADD. `git add -N` stages a record with an all-zero destination sha and no
# blob to size.
new_repo c10; small a.txt; git add a.txt; big b.bin; git add -N b.bin; run_sut; expect "add -N alongside a small staged file" PASS
new_repo c11; big b.bin; git add b.bin; small c.txt; git add -N c.txt; run_sut; expect "add -N alongside a large STAGED file" BLOCK

# HOSTILE FILENAMES. The space cases are the old ones; the newline case is why the
# enumeration is -z. Without it one record splits into two and both halves misparse.
new_repo c12; big "big name.bin";   git add "big name.bin";           run_sut; expect "large file, name with a space" BLOCK
new_repo c13; small "ok name.txt";  git add "ok name.txt";            run_sut; expect "small file, name with a space" PASS
new_repo c14; big "$(printf 'line1\nline2.bin')"; git add "$(printf 'line1\nline2.bin')"
              run_sut; expect "large file, name containing a NEWLINE" BLOCK

# BOUNDARIES. `-gt` not `-ge`: exactly LIMIT is within the limit.
new_repo c15; exact e.bin;  git add e.bin;                            run_sut; expect "exactly LIMIT bytes" PASS
new_repo c16; over1 o.bin;  git add o.bin;                            run_sut; expect "LIMIT + 1 bytes" BLOCK

# N-checked reporting: a run that examined nothing must not read like a clean run.
# (c17 sits before c18 — the cases were once written down in the other order,
# which read as a numbering mistake in every review since.)
new_repo c17; small a.txt; git add a.txt; run_sut
if grep -q 'checked 1 staged blob' <<<"$OUT"; then
  ok "reports how many blobs it checked"
else bad "no N-checked line — 'nothing found' and 'never ran' look identical" "$OUT"; fi

# Truncated --raw stream must FAIL, not report clean. A stream cut mid-metadata
# (no trailing NUL) makes the outer `read` return non-zero, which a bare
# `while read` treats as EOF. Simulate with a git shim that emits a partial
# record, running the REAL checker against it.
new_repo c18
_shim="$WORK/c18-shim"; mkdir -p "$_shim"
# Resolve the real git at generation time; selftest-binary-scan.sh uses the same
# pattern and records why: a hardcoded /usr/bin/git makes the fallback arm
# unrunnable on hosts where git lives elsewhere.
_realgit="$(command -v git)"
{ echo '#!/bin/sh'
  echo "case \"\$*\" in *\"diff --cached\"*\"--raw\"*) printf ':000000 100644 000 111 A' ;; *) exec \"$_realgit\" \"\$@\" ;; esac"
} > "$_shim/git"; chmod +x "$_shim/git"
if OUT="$(PATH="$_shim:$PATH" bash "$SUT" 2>&1)"; then RC=0; else RC=$?; fi  # bash "$SUT": same parity as run_sut
# -eq 1, not -ne 0: a deliberate rejection is exit 1. Accepting any non-zero
# would let the checker DYING for some unrelated reason (2, 127) pass this case
# as if it had caught the truncation — the exact non-discrimination this PR
# fixed in expect(), which I then reproduced here in the new assertion.
if [ "$RC" -eq 1 ] && grep -qi 'truncated' <<<"$OUT"; then
  ok "a truncated --raw stream fails closed with exit 1, not clean"
else bad "a truncated --raw stream was not cleanly rejected (rc=$RC, want 1)" "$OUT"; fi

# THE LIMIT-VALIDATION BRANCHES, which are the largest documented fail-open
# defect in the SUT and were until now the one thing nothing exercised: a
# non-numeric BIG_FILE_LIMIT silently disabled the whole gate (measured in the
# SUT's own header), and the SUT's answer is a refusal with exit 2. Assert the
# refusal — and assert it is a REFUSAL (exit 2, named), never a pass and never
# a would-be BLOCK, because a checker that scanned with a garbage limit could
# produce either.
new_repo c19; big oversized.bin; git add oversized.bin
if OUT="$(BIG_FILE_LIMIT=invalid bash "$SUT" 2>&1)"; then RC=0; else RC=$?; fi
if [ "$RC" -eq 2 ] && grep -q 'not a non-negative integer' <<<"$OUT"; then
  ok "a non-numeric BIG_FILE_LIMIT is refused (exit 2), not silently fail-open"
else bad "non-numeric limit not refused by name (rc=$RC, want 2)" "$OUT"; fi

new_repo c20; big oversized.bin; git add oversized.bin
if OUT="$(BIG_FILE_LIMIT=99999999999999999999 bash "$SUT" 2>&1)"; then RC=0; else RC=$?; fi
if [ "$RC" -eq 2 ] && grep -q 'exceeds the shell' <<<"$OUT"; then
  ok "an integer-overflow BIG_FILE_LIMIT is refused (exit 2), not silently fail-open"
else bad "overflow limit not refused by name (rc=$RC, want 2)" "$OUT"; fi

echo
echo "  $pass passed, $fail failed"
# A suite that ran no cases is not a passing suite — same guard, same reason, as
# selftest-binary-scan.sh.
_total=$((pass + fail))
# EXACT, not a floor. `-lt 15` against 17 cases let two disappear silently, which is
# the same weakness one size down: a guard that tolerates loss cannot detect loss.
# Bumping this when you add a case is the point — it forces the change to be noticed.
_EXPECTED_CASES=20   # +c18 truncated --raw stream (kit#46); +c19/c20 limit validation (round-3)
if [ "$_total" -ne "$_EXPECTED_CASES" ]; then
  echo "  ✗ $_total case(s) ran, expected exactly $_EXPECTED_CASES"
  echo "      Cases were added or lost. If added, bump _EXPECTED_CASES deliberately;"
  echo "      if lost, that is the regression this guard exists for."
  exit 1
fi
[ "$fail" -eq 0 ] || exit 1
