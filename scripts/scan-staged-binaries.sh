#!/usr/bin/env bash
# WHAT: Second-pass secret scan over binary/document files that the
#       primary `secrets` gate provably does not inspect. That gate now runs
#       `scripts/gitleaks-guard.sh git --staged`; it previously ran
#       `gitleaks protect --staged`, and `protect` is a deprecated alias. The
#       distinction does not change what this script does — both forms inherit
#       the same path allowlist, which is the hole below.
#
# WHY:  gitleaks' built-in allowlist -- inherited by .gitleaks.toml via
#       `[extend] useDefault = true` -- skips pdf/xlsx/docx/bin/exe/... BY PATH.
#       The primary gate therefore prints "no leaks found" after scanning ~0
#       bytes of them. Verified 2026-08-08 with gitleaks 8.30.1: an AWS key pair
#       in a staged .pdf passes the pre-commit gate untouched. A green check that
#       inspected nothing is the failure this closes.
#
# HOW:  Both mechanisms defeat the path allowlist by changing the PATH, not the
#       config -- so .gitleaks.toml stays the single source of truth and the full
#       built-in ruleset stays active. Nothing is duplicated, nothing can drift.
#
#         OOXML/archives -> copy to a *.zip temp name, which the built-in
#                           allowlist does not match, then let gitleaks'
#                           --max-archive-depth traverse it natively.
#         PDF            -> pdftotext to text, then `gitleaks stdin`.
#                           Raw bytes are NOT enough: content streams are
#                           deflated, so a raw scan of a real PDF reads 0 bytes.
#
# CONTRACT: every file lands in exactly one bucket, and the bucket counts are
#       printed. A zero count reads as UNKNOWN, never as clean.
#
# SOURCES: the classification and extraction below are source-agnostic, so the
#       same logic serves the pre-commit hook and CI. Only WHICH files to look at
#       and WHERE to read their bytes differ:
#
#         (default)            git diff --cached      blobs from the index  (pre-commit)
#         --range BASE HEAD    git diff BASE...HEAD   blobs from HEAD       (CI, pull_request)
#         --tree [REF]         git ls-tree -r REF     blobs from REF        (CI, push / full audit)
#
#       --config PATH overrides .gitleaks.toml. CI needs it: the workflow runs the
#       BASE branch's copy of this script against the CANDIDATE's tree, and a config
#       read from the candidate would be the very allowlist a PR could widen. See
#       the TRUST BOUNDARY note in secret-scan.yml.
#
#       CI must run this too. Verified on gitleaks 8.30.1: a secret-bearing .xlsx is
#       reported as `scanned ~0 bytes` / exit 0 by the primary scan, so before this
#       existed in CI a PR adding one was blocked locally and PASSED the job this kit
#       calls authoritative -- the local gate strictly stronger than the "reproducible
#       by construction" one, which is backwards.
#
# RESIDUAL LIMIT, stated plainly: a scanned/image-only PDF carries no text
#       layer. pdftotext returns nothing but page separators, which this script
#       reports as UNKNOWN rather than clean. A MOSTLY-image PDF that happens to
#       carry a little real text is the one case that still reads as inspected
#       while its images go unread -- OCR is the only fix for that, and it is not
#       worth the dependency yet.
# TODO(james): revisit if a repo starts committing scanned documents routinely.

set -euo pipefail

# ---------------------------------------------------------------------------
# Arguments.
#
# UNKNOWN ARGUMENTS ARE FATAL, and that is the whole reason this block is not a
# three-line case statement. Before it existed the script ignored every argument
# it did not expect: `scan-staged-binaries.sh --range A B` printed "no binary or
# document files staged" and exited 0. Measured, on the version this replaces.
# So the obvious way to close the CI gap -- point the existing script at a range --
# produced a green check that had enumerated nothing and said so in the reassuring
# words of a clean result. A gate that silently ignores the flag telling it WHAT TO
# SCAN is the same defect as one that scans zero bytes and reports clean.
# ---------------------------------------------------------------------------
MODE=staged
RANGE_BASE=""
RANGE_HEAD=""
TREE_REF="HEAD"
CONFIG_OVERRIDE=""

usage() {
  cat >&2 <<'USAGE'
usage: scan-staged-binaries.sh [--config PATH]
       scan-staged-binaries.sh --range BASE HEAD [--config PATH]
       scan-staged-binaries.sh --tree [REF] [--config PATH]

  (default)  scan files staged in the index          (pre-commit)
  --range    scan files changed in BASE...HEAD       (CI, pull_request)
  --tree     scan every file in REF, default HEAD    (CI, push / full audit)
  --config   use PATH instead of <repo root>/.gitleaks.toml
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --range)
      # Both operands are required. Accepting one would leave the other empty and
      # produce a `git diff BASE...` that means something quite different.
      [ "$#" -ge 3 ] || { echo "✗ --range needs BASE and HEAD" >&2; usage; exit 2; }
      # PRESENT IS NOT THE SAME AS NON-EMPTY, and the empty case fails silently
      # clean. `--range "" HEAD` passes the count check, and the enumeration then
      # runs `git diff ...HEAD`, which git resolves as HEAD...HEAD -- an empty diff,
      # exit 0, no error. An empty HEAD is as bad from the other end: BLOB_PREFIX
      # degrades from "$RANGE_HEAD:" to ":", so the walk silently reads the INDEX
      # while reporting the range it was asked for. Empty operands are how a CI
      # expression that resolved to nothing arrives here.
      [ -n "$2" ] && [ -n "$3" ] || {
        echo "✗ --range BASE and HEAD must both be non-empty" >&2
        echo "  Got BASE='$2' HEAD='$3'. An unset CI expression lands here." >&2
        exit 2; }
      MODE=range; RANGE_BASE="$2"; RANGE_HEAD="$3"; shift 3 ;;
    --tree)
      MODE=tree
      # Optional operand: treat a following `--flag` as the next option, not a ref.
      # -n as well: an empty operand is not `--`-prefixed, so without it `--tree ""`
      # sets TREE_REF="" and BLOB_PREFIX=":" -- the same silent fall-through to the
      # index as the --range case above.
      if [ "$#" -ge 2 ] && [ -n "$2" ] && [ "${2#--}" = "$2" ]; then
        TREE_REF="$2"; shift 2
      else
        shift
      fi ;;
    --config)
      [ "$#" -ge 2 ] || { echo "✗ --config needs a path" >&2; usage; exit 2; }
      CONFIG_OVERRIDE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      printf '\n✗ scan-staged-binaries: unrecognised argument: %s\n' "$1" >&2
      printf '  Refusing to run. An ignored argument here means scanning the wrong\n' >&2
      printf '  thing — or nothing — and reporting it as clean.\n\n' >&2
      usage
      exit 2 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
# No cd. Every path this script touches is either absolute ($TMPDIR_SCAN,
# $CONFIG, the probe copies) or resolved by git itself: `git diff --cached`
# prints root-relative names from any cwd, and `git cat-file blob ":<path>"`
# is ROOT-relative by definition (`:./<path>` is the cwd-relative form --
# measured from a nested subdirectory during this rollout). An advisory
# `cd || true` briefly lived here and earned a review finding for swallowing
# its own failure; the correct amount of cd is none.

# Version pre-flight, in the guard's ASSERTION-ONLY mode (no arguments). The
# canaries below prove BEHAVIOUR -- stdin and archive traversal work -- but not
# the floor: a supported-but-below-floor gitleaks passes them and then scans
# with different allowlist semantics than .gitleaks.toml documents. This is a
# separate pre-flight rather than routing the scan calls through the guard,
# because the canaries read exit 1 as "toolchain works" and the guard also
# exits 1 on rejection -- wrapping would turn a version failure into a false OK
# (recorded at length in gitleaks-version.env).
# Resolved against THIS SCRIPT's directory, not REPO_ROOT: the guard ships next
# to the scanner wherever the scanner is (the self-test runs it from fixture
# repos that have no scripts/ tree -- resolving by repo root failed 13 of 14
# suite cases the first time, which is itself the lesson: probe the resolver
# from somewhere other than the happy path).
_SELF_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
if ! "$_SELF_DIR/gitleaks-guard.sh" >/dev/null 2>&1; then
  echo "  ✗ gitleaks on PATH fails the version guard — refusing to scan binaries with it"
  echo "      Run scripts/gitleaks-guard.sh for the specific reason."
  exit 1
fi
CONFIG="${CONFIG_OVERRIDE:-$REPO_ROOT/.gitleaks.toml}"
# Name the missing config. Handing a nonexistent --config to gitleaks makes it fall
# back to its BUILT-IN ruleset, which still finds plenty and still exits 0 on a clean
# file -- so a typo'd path would scan with silently different coverage than the
# .gitleaks.toml this repo documents, and nothing in the output would say so.
#
# -f as well as -r, for the reason gitleaks-guard.sh records at its own version-file
# check: `[ -r ]` is true for a directory, and truer still for a FIFO -- and a FIFO
# here fails in the worst possible direction. This script reads $CONFIG SEVERAL
# times (the canary probe, then once per scanned file). A process substitution --
# `--config <(git show base:.gitleaks.toml)`, which is exactly how someone wires a
# config from another ref in CI -- serves the first read and returns EOF to every
# read after it. gitleaks then parses an empty config, loads no rules, finds nothing
# and exits 0. Measured while building the live test for this very change: a green
# "no leaks found" over a file carrying the canary. A one-shot config is UNKNOWN
# coverage wearing a clean result, so require a real, re-readable file.
# stderr, like every other refusal in this script: at pre-commit the hook
# multiplexes streams, and a refusal on stdout can sort below the clean chatter it
# contradicts.
if [ ! -f "$CONFIG" ] || [ ! -r "$CONFIG" ]; then
  echo "  ✗ cannot read gitleaks config as a regular file: $CONFIG" >&2
  echo "      Refusing to scan with unknown coverage. If you meant to use a config" >&2
  echo "      from another ref, write it to a real file first — a pipe or process" >&2
  echo "      substitution is read once and silently empty thereafter." >&2
  exit 1
fi

# Where to read each file's bytes. `:path` is the index; `REF:path` is that commit's
# blob. The three call sites below share this prefix, so the walk does not care which
# source it is reading.
case "$MODE" in
  staged) BLOB_PREFIX=":" ;;
  range)  BLOB_PREFIX="$RANGE_HEAD:" ;;
  tree)   BLOB_PREFIX="$TREE_REF:" ;;
  # Same argument in_list() makes for its list names: that $MODE holds one of three
  # literals is a property of the PARSER, not of this block, and a comment cannot
  # fail. Without this branch a fourth mode added later leaves BLOB_PREFIX unset,
  # `git cat-file blob "$path"` fails per file, and the run reports a pile of
  # UNKNOWNs instead of naming the actual fault.
  *) printf '\n✗ scan-staged-binaries: no blob source for mode: %s\n\n' "$MODE" >&2
     exit 2 ;;
esac

# Archive-shaped documents. gitleaks can read inside these once the path
# allowlist stops skipping them, so they are fully inspectable.
# shellcheck disable=SC2034  # read indirectly by in_list; see its definition
ARCHIVE_EXTS=(xlsx xlsm docx docm pptx pptm odt ods odp jar war zip)

# Text-extractable documents. Need an external extractor.
# shellcheck disable=SC2034  # read indirectly by in_list; see its definition
PDF_EXTS=(pdf)

# Formats no text scanner can meaningfully read. Reported, never inspected,
# and deliberately NOT blocking -- a credential in a screenshot is invisible to
# a text scanner either way, so blocking here buys noise, not coverage.
# shellcheck disable=SC2034  # read indirectly by in_list; see its definition
# doc/xls/suo/wsuo/v2/vsidx are here for a sharper reason than the images: the
# BUILT-IN allowlist path-skips them (measured on 8.30.1 -- a canary in probe.doc
# is invisible to the primary scan), and until this line they were in no bucket
# here either, so they fell through the "anything else is text" comment while
# provably uncovered. The svg double-miss, in legacy-Office form. OLE compound
# files have no extractor in this stack yet, so they are REPORTED rather than
# read; ppt/dot/xlt/pot/vsd were probed too and are NOT built-in-skipped, so
# they stay with the primary scan.
OPAQUE_EXTS=(doc xls suo wsuo v2 vsidx
             png jpg jpeg gif webp ico bmp tif tiff avif heic
             mp3 mp4 mov avi mkv wav aiff flac
             exe dll so dylib bin dmg pkg iso
             woff woff2 ttf otf eot
             fbx blend casc obj glb gltf psd ai sketch
             pyc pdb class o a)

# Text formats the PRIMARY gate skips by path. They need no extractor -- they are
# already text -- but gitleaks' built-in allowlist refuses to read them, so they
# reach neither scanner unless routed here. svg is the live case: XML, often
# hand-edited, and a credential in one is plainly readable.
# shellcheck disable=SC2034  # read indirectly by in_list
TEXT_SKIPPED_EXTS=(svg)

MAX_ARCHIVE_DEPTH=5

inspected=0        # files actually read by a scanner
inspected_bytes=0  # bytes those scanners actually consumed
opaque=()          # not inspectable by any text scanner
unknown=()         # SHOULD have been inspectable but was not -- fails the gate
leaks=0
archive_canary=""  # "" not probed | ok | bad | nopython | buildfail | norule
pdf_canary=""

TMPDIR_SCAN="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SCAN"' EXIT

# Split so the literal never appears as a matchable token in this file -- it
# would otherwise trip the coderabbit-api-key rule when this script is staged.
CANARY_TOKEN="cr-""canary0123456789abcdefghij"

# This script calls `gitleaks` directly rather than through gitleaks-guard.sh --
# deliberately, and gitleaks-version.env explains why at length: the canaries read
# `exit 1` as "the toolchain works", and the guard also exits 1 when it rejects a
# version, so routing through it would turn a version failure into a false OK.
#
# What this script needs is SUBCOMMAND support -- `stdin`, `dir`, and
# --max-archive-depth -- none of which exist on the 1.x line (a reviewer's sandbox
# reported 1.7.3). Rather than parse a version string or trust --help -- a summary,
# not a contract -- assert BEHAVIOR: push a known secret through the exact code path
# we rely on and require a hit. No hit means the toolchain cannot do the job, which
# is UNKNOWN, never clean.
#
# The probes distinguish "the path is broken" from "the probe could not be built",
# because those send you to different places. Collapsing them is what made a missing
# python3 tell the developer to upgrade a gitleaks that was already correct -- note
# the asymmetry that made it so misleading: the real archive scan needs no python3
# at all, only the probe does. canary_archive_ok documents its exact codes above
# its definition; keep that list and the caller's case statement in step.
canary_stdin_ok() {
  local rc=0
  printf 'token %s\n' "$CANARY_TOKEN" \
    | gitleaks stdin --no-banner --redact --config "$CONFIG" >/dev/null 2>&1 || rc=$?
  [ "$rc" -eq 1 ]
}

# Returns:
#   0 = archive traversal works
#   1 = gitleaks cannot traverse archives
#   2 = python3 is absent, so the probe could not be built
#   3 = gitleaks scanned the probe and found nothing -> the config lost the rule
#   4 = python3 is present but building the zip failed
#
# Four codes for four causes, and the contract is spelled out because the first
# version of this split collapsed 2 and 4 into one code while the caller printed
# "python3 missing" for both -- reintroducing, at smaller scale, the exact
# cause-conflation this function was split up to fix.
canary_archive_ok() {
  local rc=0 z="$TMPDIR_SCAN/canary.zip"
  command -v python3 >/dev/null 2>&1 || return 2
  python3 - "$z" "$CANARY_TOKEN" <<'PY' 2>/dev/null || return 4
import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("payload.txt", "token " + sys.argv[2])
PY
  gitleaks dir --no-banner --redact --config "$CONFIG" \
    --max-archive-depth "$MAX_ARCHIVE_DEPTH" "$z" >/dev/null 2>&1 || rc=$?
  rm -f "$z"
  # rc=1 means gitleaks found the canary: the traversal path works. rc=0 means it
  # scanned and found nothing, which on a file containing the token means this
  # repo's .gitleaks.toml no longer carries the rule the canary matches -- a
  # config problem, not a version problem, and it must not be reported as one.
  [ "$rc" -eq 1 ] && return 0
  [ "$rc" -eq 0 ] && return 3
  return 1
}

# Match an extension against a list passed BY NAME, e.g. `in_list pdf PDF_EXTS`.
#
# The lists were whitespace-separated strings iterated unquoted, which relied on
# word splitting AND left the words open to pathname expansion -- harmless only
# because no entry happens to contain a glob character. That is a property of the
# current data, not of the code, so an entry like `*.bak` added later would have
# silently matched files in the working directory. Arrays remove the class rather
# than documenting it.
#
# Passed by NAME and indexed via eval, which is the portable option here: `local -n`
# needs bash 4.3 and ${!name[i]} does not do array-element indirection, while this
# has to run under /bin/bash 3.2 on stock macOS. The eval only ever interpolates a
# literal list name from this file, never anything derived from a staged path.
in_list() {
  local needle="$1" listname="$2" i item count
  # Enforce the invariant the comment above only asserted. `listname` reaching
  # eval must be one of the bucket literals defined at the top of this file, and
  # today it always is — but that is a property of the current call sites, not
  # of the function, and a comment cannot fail. A future caller passing a
  # variable now gets a loud error instead of an eval. Cost is three string
  # comparisons per lookup.
  #
  # exit rather than return: every call site is an `if`/`elif` test, and a
  # non-zero RETURN there reads as "not in this list" — so the file would quietly
  # fall through to the next branch and land in the wrong bucket, with the error
  # scrolling past in hook output. An unknown list name is a programming mistake,
  # not a data condition, and this script's contract is that a bucket it cannot
  # classify is never reported clean.
  case "$listname" in
    ARCHIVE_EXTS|PDF_EXTS|TEXT_SKIPPED_EXTS|OPAQUE_EXTS) ;;
    *) printf '\n✗ in_list: refusing to expand unknown list name: %s\n' "$listname" >&2
       printf '  Add it to the allowlist in in_list() if it is legitimate.\n\n' >&2
       exit 2 ;;
  esac
  eval "count=\${#${listname}[@]}"
  i=0
  while [ "$i" -lt "$count" ]; do
    eval "item=\${${listname}[$i]}"
    [ "$needle" = "$item" ] && return 0
    i=$((i + 1))
  done
  return 1
}

# gitleaks reports its own coverage as "scanned ~N bytes". We read that number
# rather than the input size because for archives the meaningful figure is the
# DECOMPRESSED bytes it actually looked at. Parse failure is treated as UNKNOWN,
# never as clean -- if this log line ever changes shape, the gate must go amber,
# not green. selftest-binary-scan.sh asserts the parse against real output.
parse_scanned_bytes() {
  sed -n 's/.*scanned ~\([0-9][0-9]*\) bytes.*/\1/p' "$1" | tail -n1
}

# $1 = human label for messages, $2 = path to the content to scan
run_gitleaks_stdin() {
  local label="$1" payload="$2" out rc=0 bytes
  out="$TMPDIR_SCAN/out.log"
  gitleaks stdin --no-banner --redact --config "$CONFIG" \
    < "$payload" > "$out" 2>&1 || rc=$?
  bytes="$(parse_scanned_bytes "$out")"

  if [ "$rc" -gt 1 ]; then
    echo "  ✗ $label — gitleaks errored (exit $rc); treating as NOT INSPECTED"
    sed 's/^/      /' "$out"
    unknown+=("$label")
    return
  fi
  if [ -z "$bytes" ] || [ "$bytes" -eq 0 ]; then
    unknown+=("$label (extractor produced no readable text)")
    return
  fi

  inspected=$((inspected + 1))
  inspected_bytes=$((inspected_bytes + bytes))
  if [ "$rc" -eq 1 ]; then
    leaks=$((leaks + 1))
    # Quote ONLY when the name carries a control character. A newline or CR would
    # break the diagnostic across lines and hide which file holds the secret;
    # spaces are harmless and %q would render every ordinary name with
    # backslashes, making the common case worse to read to fix a case that
    # needs a deliberately hostile filename.
    case "$label" in
      *[[:cntrl:]]*) printf '  ✗ SECRET in %q\n' "$label" ;;
      *)             printf '  ✗ SECRET in %s\n' "$label" ;;
    esac
    sed 's/^/      /' "$out"
  fi
}

# $1 = human label, $2 = path to an archive-shaped file
run_gitleaks_archive() {
  local label="$1" src="$2" probe out rc=0 bytes
  # The .zip extension is the whole trick: it is absent from gitleaks' built-in
  # allowlist, so the file is no longer skipped by path.
  probe="$TMPDIR_SCAN/probe.zip"
  cp "$src" "$probe"
  out="$TMPDIR_SCAN/out.log"
  gitleaks dir --no-banner --redact --config "$CONFIG" \
    --max-archive-depth "$MAX_ARCHIVE_DEPTH" "$probe" > "$out" 2>&1 || rc=$?
  bytes="$(parse_scanned_bytes "$out")"
  rm -f "$probe"

  if [ "$rc" -gt 1 ]; then
    echo "  ✗ $label — gitleaks errored (exit $rc); treating as NOT INSPECTED"
    sed 's/^/      /' "$out"
    unknown+=("$label")
    return
  fi
  if [ -z "$bytes" ] || [ "$bytes" -eq 0 ]; then
    unknown+=("$label (archive unreadable or empty)")
    return
  fi

  inspected=$((inspected + 1))
  inspected_bytes=$((inspected_bytes + bytes))
  if [ "$rc" -eq 1 ]; then
    leaks=$((leaks + 1))
    # %q for the same reason as the sed rewrite below: $label is a staged
    # filename and may carry newlines or control characters.
    printf '  ✗ SECRET in %q\n' "$label"
    # Findings name the temp probe path; point them back at the real file.
    # Both sides are escaped: $label is a STAGED FILENAME, so a `|` ends the s
    # command, a `&` in the replacement re-inserts the whole match, and a `\`
    # escapes the next character -- corrupting the one message that tells you
    # which file holds the secret.
    _pat=$(printf '%s' "$probe" | sed 's/[|\\.*^$[]/\\&/g')
    # %q, not %s: a filename may contain a NEWLINE, which would split the sed
    # program itself. %q renders it as a single shell-quoted token, so the
    # diagnostic stays on one line and still names the file unambiguously.
    _rep=$(printf '%q' "$label" | sed 's/[|\\&]/\\&/g')
    sed "s|$_pat|$_rep|g; s/^/      /" "$out"
  fi
}

# Enumerate FIRST, and fail closed if git itself fails. With the loop fed
# straight from a process substitution, a git that exits non-zero produced an
# empty stream -- so the walk ran zero times and the script reported "no binary
# or document files staged" and exited 0. Verified with a git shim returning
# 128: clean verdict over an unknown index. A scan that enumerated nothing is
# UNKNOWN, never clean; that is this file's whole contract.
STAGED_LIST="$TMPDIR_SCAN/staged.list"
case "$MODE" in
  staged)
    enum_desc="the index"
    git diff --cached --name-only -z --diff-filter=ACMRT > "$STAGED_LIST" ;;
  range)
    enum_desc="$RANGE_BASE...$RANGE_HEAD"
    # Three dots: changes introduced ON the head side since the merge base, which
    # is the PR's own diff. Two dots would also enumerate everything that landed on
    # the base branch since the fork point -- files this PR never touched, reported
    # against its author.
    git diff --name-only -z --diff-filter=ACMRT "$RANGE_BASE...$RANGE_HEAD" > "$STAGED_LIST" ;;
  tree)
    enum_desc="every file in $TREE_REF"
    # --full-tree is load-bearing, and its absence fails silently clean. Unlike
    # `git diff`, `git ls-tree` is CWD-SENSITIVE: from a subdirectory it lists only
    # that subtree, and names entries relative to it. Measured in a two-file repo --
    # from `sub/`, `ls-tree -r HEAD` returned `nested.txt` and omitted `root.txt`
    # entirely. So a --tree run from anywhere but the root would scan a SUBSET and
    # report it as the whole tree, and the surviving paths would then miss
    # `git cat-file blob "REF:path"` because that is root-relative.
    # --full-tree makes it behave from the root regardless of cwd, which restores
    # the "no cd, every path resolved by git itself" property the rest of this file
    # relies on.
    git ls-tree --full-tree -r -z --name-only "$TREE_REF" > "$STAGED_LIST" ;;
esac || {
  # Fail closed on an enumeration that errored. With the loop fed straight from a
  # process substitution, a git that exits non-zero produced an EMPTY stream -- so
  # the walk ran zero times and the script reported "no binary or document files
  # staged" and exited 0. Verified with a git shim returning 128: a clean verdict
  # over an unknown index. This applies to all three sources; a bad --range ref is
  # the new way to reach it, and it must not read as "nothing to scan".
  echo "  ✗ could not enumerate files from $enum_desc (git exited non-zero)"
  echo "      Refusing to report clean over a file list this script could not read."
  exit 1
}

# The redirect that feeds the loop below already fails closed: under
# `set -euo pipefail` an unreadable STAGED_LIST aborts before the summary
# (verified, rc=1, for both a missing and an unreadable file). But it aborts
# ANONYMOUSLY -- a bare "No such file or directory" naming neither this script
# nor what it was doing -- which is the failure mode gitleaks-guard.sh exists to
# replace. This check runs first so the cause has a name.
if [ ! -r "$STAGED_LIST" ]; then
  echo "  ✗ staged-file list is unreadable ($STAGED_LIST)"
  echo "      Refusing to report clean over an index this script could not read."
  exit 1
fi

# ---------------------------------------------------------------------------
# Walk the enumerated files. -z because this repo family has filenames with spaces.
# Scan the BLOB named by $BLOB_PREFIX, not the worktree file. In the default mode
# those differ whenever a file was edited after `git add`, and it is the staged bytes
# that are about to ship; in --range/--tree the worktree may not even hold the
# revision under review.
# ---------------------------------------------------------------------------
while IFS= read -r -d '' path; do
  ext="${path##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  [ "$ext" = "$path" ] && continue   # no extension -> primary gate's business

  staged="$TMPDIR_SCAN/staged.blob"
  if in_list "$ext" ARCHIVE_EXTS; then
    # Memoized: at most one probe per bucket, per run.
    if [ -z "$archive_canary" ]; then
      probe_rc=0; canary_archive_ok || probe_rc=$?
      case "$probe_rc" in
        0) archive_canary=ok ;;
        2) archive_canary=nopython ;;
        3) archive_canary=norule ;;
        4) archive_canary=buildfail ;;
        *) archive_canary=bad ;;
      esac
    fi
    # Every non-ok state still fails closed as UNKNOWN. Only the stated CAUSE
    # differs, and that is the whole point: each of these sends the developer
    # somewhere different, and the old single message sent two of the three to
    # the wrong place.
    case "$archive_canary" in
      bad)
        unknown+=("$path (gitleaks on PATH cannot traverse archives — needs 8.x)")
        continue ;;
      nopython)
        unknown+=("$path (cannot verify archive scanning: python3 is not installed, so the probe could not be built — gitleaks itself may be fine)")
        continue ;;
      buildfail)
        unknown+=("$path (cannot verify archive scanning: python3 is present but failed to build the probe zip — check the python3 install, not gitleaks)")
        continue ;;
      norule)
        unknown+=("$path (archive probe scanned clean: .gitleaks.toml no longer carries the rule the canary matches — fix the config, not the scanner)")
        continue ;;
    esac
    git cat-file blob "$BLOB_PREFIX$path" > "$staged" || {
      # Without this the failure is a bare git diagnostic under set -e, naming
      # neither this script nor the file it could not read -- and an unreadable
      # staged blob is UNKNOWN, not clean.
      unknown+=("$path (could not read the staged blob)")
      continue
    }
    run_gitleaks_archive "$path" "$staged"
  elif in_list "$ext" PDF_EXTS; then
    if ! command -v pdftotext >/dev/null 2>&1; then
      unknown+=("$path (pdftotext not installed — brew install poppler)")
      continue
    fi
    if [ -z "$pdf_canary" ]; then
      if canary_stdin_ok; then pdf_canary=ok; else pdf_canary=bad; fi
    fi
    if [ "$pdf_canary" = bad ]; then
      unknown+=("$path (gitleaks on PATH has no working \`stdin\` scan — needs 8.x)")
      continue
    fi
    git cat-file blob "$BLOB_PREFIX$path" > "$staged" || {
      # Without this the failure is a bare git diagnostic under set -e, naming
      # neither this script nor the file it could not read -- and an unreadable
      # staged blob is UNKNOWN, not clean.
      unknown+=("$path (could not read the staged blob)")
      continue
    }
    text="$TMPDIR_SCAN/extracted.txt"
    if ! pdftotext -q "$staged" "$text" 2>/dev/null; then
      unknown+=("$path (pdftotext could not parse it)")
      continue
    fi
    # A scanned/image-only PDF still yields one page-separator byte per page, so
    # a raw byte count would climb with page count and read as "inspected" while
    # nothing was actually read. Count NON-WHITESPACE characters instead: that is
    # zero for an image-only document regardless of how long it is.
    if [ "$(tr -d '[:space:]' < "$text" | wc -c | tr -d ' ')" -eq 0 ]; then
      unknown+=("$path (no text layer — image-only or scanned PDF)")
      continue
    fi
    run_gitleaks_stdin "$path" "$text"
  elif in_list "$ext" TEXT_SKIPPED_EXTS; then
    if [ -z "$pdf_canary" ]; then
      if canary_stdin_ok; then pdf_canary=ok; else pdf_canary=bad; fi
    fi
    if [ "$pdf_canary" = bad ]; then
      unknown+=("$path (gitleaks on PATH has no working \`stdin\` scan — needs 8.x)")
      continue
    fi
    git cat-file blob "$BLOB_PREFIX$path" > "$staged" || {
      # Without this the failure is a bare git diagnostic under set -e, naming
      # neither this script nor the file it could not read -- and an unreadable
      # staged blob is UNKNOWN, not clean.
      unknown+=("$path (could not read the staged blob)")
      continue
    }
    run_gitleaks_stdin "$path" "$staged"
  elif in_list "$ext" OPAQUE_EXTS; then
    opaque+=("$path")
  fi
  # Anything else is text AND not path-skipped, so the primary `secrets` gate
  # already read it. Formats the primary gate skips belong in TEXT_SKIPPED_EXTS.
# ACMRT, not ACM. A `git mv` of a binary is status R and a symlink replaced by
# a real file is T; both were enumerated as NOTHING, so the scan printed "no
# binary or document files staged" and exited 0 over a staged secret. Verified.
# D is excluded (no blob to read) and U (unmerged) has no single staged blob.
done < "$STAGED_LIST"

# ---------------------------------------------------------------------------
# Report. N-scanned is the point: "nothing was reported" and "the check never
# ran" must never look the same.
# ---------------------------------------------------------------------------
total=$((inspected + ${#opaque[@]} + ${#unknown[@]}))
if [ "$total" -eq 0 ]; then
  # Name the source that was searched. "no binary or document files" alone reads
  # identically whether the gate examined the right revision or the wrong one, and
  # in CI nobody is standing there knowing which range they meant.
  echo "  binary scan: no binary or document files found in $enum_desc"
  exit 0
fi

echo "  binary scan: $enum_desc — inspected $inspected file(s), $inspected_bytes bytes read"

if [ "${#opaque[@]}" -gt 0 ]; then
  echo "  ⓘ NOT INSPECTED — no text scanner can read these (${#opaque[@]}):"
  printf '      %s\n' "${opaque[@]}"
  echo "      Judge these by hand. This is not a clean result."
fi

if [ "${#unknown[@]}" -gt 0 ]; then
  echo "  ✗ UNKNOWN — these should have been inspectable but were not (${#unknown[@]}):"
  printf '      %s\n' "${unknown[@]}"
  echo "      Fix the extractor, or unstage the file. Refusing to report clean."
  exit 1
fi

# "commit blocked" is only true at pre-commit. In CI nothing is being committed, and
# a message naming the wrong action sends the reader looking for a local hook.
[ "$leaks" -gt 0 ] && {
  case "$MODE" in
    staged) echo "  ✗ $leaks file(s) contain secrets — commit blocked" ;;
    *)      echo "  ✗ $leaks file(s) contain secrets — failing this check" ;;
  esac
  exit 1
}

exit 0
