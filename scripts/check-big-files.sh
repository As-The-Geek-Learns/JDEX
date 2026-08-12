#!/usr/bin/env bash
# WHAT: refuse a commit that stages a blob over LIMIT bytes.
#
# WHY it is a script rather than an inline lefthook `run:` block: this check was wrong
# in FOUR distinct ways in a single day, and three of those were introduced while
# fixing the previous one (see #12). Every version passed casual reading. Code with
# that profile needs a test, and an inline YAML block cannot be tested — so the logic
# lives here and scripts/selftest-no-big-files.sh exercises it.
#
# THE PATH SOURCE IS THE POINT. Earlier versions took lefthook's `{staged_files}`,
# which filters out paths that do not exist in the WORKING TREE before the job runs.
# So: stage a large file, `rm` it, and the blob still lands in the commit while
# lefthook reports `no-big-files (skip) no files for inspection`. No measurement
# source inside the hook can recover from that — the path never arrives. Enumerating
# from `git diff --cached` instead is the whole fix.
#
# THE MEASUREMENT SOURCE IS ALSO THE POINT, separately. Sizing the worktree file
# blocked symlinks (it followed them to their target) and git-lfs assets (it measured
# the real file, not the pointer that is actually committed) — memorably telling you
# to "use LFS" about a file already in LFS. `git cat-file -s <dstsha>` sizes the blob
# that is about to ship, which is the only number the limit is about.

set -euo pipefail

LIMIT="${BIG_FILE_LIMIT:-5242880}"   # 5 MiB. Overridable so the self-test can use
                                     # small fixtures instead of writing 5 MB per case.

# VALIDATE THE LIMIT, because a bad one fails OPEN. `[ "$size" -gt "$LIMIT" ]` with a
# non-numeric LIMIT makes test print "integer expected" and return non-zero — and that
# comparison lives inside an `if`, where errexit does not apply. So the branch is
# simply not taken and every blob is reported clean. Measured with
# BIG_FILE_LIMIT=invalid over a 4000-byte staged file: exit 0, and the summary line
# read "none over invalid bytes". A size gate that a typo'd env var switches off
# silently is worse than no gate, because the green tick still gets believed.
case "$LIMIT" in
  ''|*[!0-9]*)
    echo "✗ BIG_FILE_LIMIT is not a non-negative integer: '$LIMIT'"
    echo "    Refusing to run — an unparseable limit disables this check silently."
    exit 2 ;;
esac
# Upper bound WITHOUT ARITHMETIC, because the arithmetic form has the very defect it
# is meant to catch. `[ "$LIMIT" -gt <max> ]` on an out-of-range value errors
# ("integer expected"), and inside an `if` that is merely false — so the absurd limit
# passes the guard and every later size comparison then fails the same way, in its own
# `if`, where errexit also cannot see it. The result is a clean report over an
# oversized blob. Both of these were measured on this script:
#   BIG_FILE_LIMIT=99999999999999999999  (20 digits) — passed a `-gt` guard
#   BIG_FILE_LIMIT=9999999999999999999   (19 digits, > INT64_MAX) — passed a length guard
#
# So: strip leading zeros, then compare by LENGTH and, at equal length, LEXICALLY.
# For two digit-only strings of equal length lexical order IS numeric order, and
# neither operation can overflow.
LIMIT=${LIMIT#"${LIMIT%%[!0]*}"}   # 0000123 -> 123; also stops `[` from ever seeing
LIMIT=${LIMIT:-0}                  # a leading-zero form. "000" -> "" -> "0".
_INT64_MAX=9223372036854775807
# shellcheck disable=SC2071  # `>` is deliberate: -gt is exactly what overflows here.
if [ "${#LIMIT}" -gt "${#_INT64_MAX}" ] || \
   { [ "${#LIMIT}" -eq "${#_INT64_MAX}" ] && [[ "$LIMIT" > "$_INT64_MAX" ]]; }; then
  echo "✗ BIG_FILE_LIMIT exceeds the shell's integer range: $LIMIT"
  echo "    Refusing to run: a limit this large disables the check, and the"
  echo "    comparison it feeds would error inside an \`if\`, where errexit cannot see it."
  exit 2
fi

# --diff-filter=ACMRT, not ACMR. A symlink in HEAD replaced by a large regular file
# has status T; with T missing, git emitted no record at all and the file committed
# unexamined. D is excluded because a deletion has no destination blob to size.
#
# -z, and the parse below is NUL-delimited throughout. Without it a filename
# containing a NEWLINE splits one record into two, and the fragments parse as
# garbage — on a check whose failure mode is "silently examined nothing", a filename
# is not a safe thing to trust. git also QUOTES such paths without -z (core.quotePath),
# so the name printed in the refusal would not be the name on disk.
#
# Enumeration failure is fatal. A git that exits non-zero writes nothing, and an empty
# record list is indistinguishable from "nothing staged" unless the status is checked.
records=$(mktemp)
trap 'rm -f "$records"' EXIT
# --no-abbrev: --raw abbreviates SHAs by default, and an abbreviated sha handed to
# `git cat-file -s` can be ambiguous in a large object store — failing (or worse,
# resolving against a different object) for a reason that has nothing to do with
# the file being sized. Full names cost nothing and remove the class.
if ! git diff --cached -z --raw --no-abbrev --diff-filter=ACMRT > "$records"; then
  echo "✗ could not enumerate staged files (git exited non-zero)"
  echo "    Refusing to report clean over an index this check could not read."
  exit 1
fi

# `git diff --raw -z` emits, per record:
#   :<srcmode> <dstmode> <srcsha> <dstsha> <status>\0<path>\0
# and for R/C a SECOND path (source then destination). The metadata field is
# space-separated and NUL-terminated; the paths follow as their own NUL-terminated
# fields, which is why this reads fields rather than lines.
checked=0
oversize=0

# `read` returns non-zero on EOF whether the buffer is empty (clean end, between
# records) or holds a partial field with no trailing NUL (a truncated stream).
# The bare `while read` could not tell them apart: both ended the loop and the
# script reported clean. Distinguish by the buffer -- non-empty on a failed read
# means the stream was cut mid-metadata, which is malformed input, not EOF.
while true; do
  IFS= read -r -d '' meta || {
    [ -z "$meta" ] && break
    echo "  ✗ truncated record from git diff --raw (metadata field has no NUL terminator)" >&2
    echo "      Refusing to report clean over a stream this script could not parse." >&2
    exit 1
  }
  # Strip the leading ':' then walk the five space-separated fields. The two we do
  # not use are STEPPED OVER rather than assigned to named-but-unused variables —
  # each `${r#* }` below is one field, and the comment says which.
  r=${meta#:}
  r=${r#* }                        # srcmode — unused
  dstmode=${r%% *}; r=${r#* }
  r=${r#* }                        # srcsha  — unused
  dstsha=${r%% *};  r=${r#* }
  status=$r

  # Read the path field(s). R and C carry two; everything else carries one, and the
  # destination is the one that matters because it is what gets committed.
  # A record whose path field is MISSING is malformed input, not end-of-stream:
  # `|| break` here ended the loop early and every record after the malformed one
  # went unchecked — a truncated stream reported clean, which is the exact
  # failure this file's header promises never to have. EOF is only legal at the
  # top of the loop (the meta read); inside a record it is an error.
  IFS= read -r -d '' path || {
    echo "  ✗ malformed record from git diff --raw (status '$status', path field missing)" >&2
    echo "      Refusing to report clean over a stream this script could not parse." >&2
    exit 1
  }
  case "$status" in
    R*|C*) IFS= read -r -d '' path || {
      echo "  ✗ malformed R/C record from git diff --raw (destination path missing)" >&2
      echo "      Refusing to report clean over a stream this script could not parse." >&2
      exit 1
    } ;;
  esac

  # GITLINKS HAVE NO BLOB. A staged submodule pointer is mode 160000 and its sha
  # names a COMMIT in another repository, which this repo does not have. Without this
  # guard `git cat-file -s` fails with "could not get object info", errexit kills the
  # hook, and — the part that matters — any large file staged AFTER the gitlink is
  # never reached. Measured: small+gitlink+6MB exited 128 without ever checking the
  # 6MB file.
  [ "$dstmode" = 160000 ] && continue

  # An all-zero destination sha has no object to size. Only status D produces one and
  # D is filtered out above, so this is defensive: if some git version emits one,
  # cat-file would fail and errexit would refuse the commit for the wrong reason.
  case "$dstsha" in
    *[!0]*) ;;
    *) continue ;;
  esac

  # Named failure branch: without it, a cat-file error aborts under errexit with

  # a bare git diagnostic — anonymously, the one thing this file says it will

  # never do. An unsizable staged blob is a refused commit, with the path named.

  size=$(git cat-file -s "$dstsha") || {

    echo "  ✗ could not size the staged blob for $path (git cat-file -s $dstsha failed)" >&2

    echo "      Refusing to pass a file this script could not measure." >&2

    exit 1

  }
  checked=$((checked + 1))
  if [ "$size" -gt "$LIMIT" ]; then
    # Report the real numbers. An earlier version truncated to MB and told you a blob
    # one byte over the limit "is 5MB" against a "5MB" limit, which reads as a bug in
    # the check rather than a fact about the file.
    printf '✗ %s is %s bytes, over the %s byte limit — use LFS or add to .gitignore\n' \
      "$path" "$size" "$LIMIT"
    oversize=$((oversize + 1))
  fi
done < "$records"

# Report N-checked. "nothing was reported" and "the check never ran" must not look the
# same — this gate has produced the second while appearing to be the first.
if [ "$oversize" -gt 0 ]; then
  echo "  checked $checked staged blob(s); $oversize over the limit"
  exit 1
fi
echo "  no-big-files: checked $checked staged blob(s), none over $LIMIT bytes"
exit 0
