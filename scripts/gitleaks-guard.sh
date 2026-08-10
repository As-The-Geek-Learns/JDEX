#!/usr/bin/env bash
# WHAT: version-asserting wrapper around gitleaks. Asserts the binary on PATH meets
#       GITLEAKS_MIN_VERSION, then execs gitleaks with every argument passed through.
#       With no arguments it performs the assertion only and exits.
#
# WHY: see scripts/gitleaks-version.env. Short version -- a secret scanner whose
#      version you cannot name is a scanner whose coverage you cannot state.
#
# Usage:
#   scripts/gitleaks-guard.sh git --staged --redact --no-banner
#   scripts/gitleaks-guard.sh                # assertion only, no scan
set -euo pipefail

unset CDPATH   # a CDPATH entry would make the `cd` below resolve somewhere else
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)

# die() is defined BEFORE the source on purpose. Sourcing a missing file aborts
# under `set -e`, and if die() lived below that line the failure would surface as
# a bare shell error naming neither this guard nor the file it wanted. Failing
# closed is right; failing anonymously is not. Provisioning copies the version
# file alongside this script, so this only fires once someone deletes or
# unreadable-permissions it — exactly the moment a named cause pays for itself.
die() {
  printf '\n✗ gitleaks-guard: %s\n\n' "$1" >&2
  exit 1
}

VERSION_ENV="$SCRIPT_DIR/gitleaks-version.env"
# -f as well as -r: `[ -r ]` is true for a readable DIRECTORY, and sourcing one
# fails with a shell diagnostic instead of reaching die() — the same anonymous
# failure this check exists to replace. A readable FIFO would be worse still,
# blocking the hook indefinitely rather than failing at all.
[ -f "$VERSION_ENV" ] && [ -r "$VERSION_ENV" ] || die "cannot read $VERSION_ENV
    That file carries GITLEAKS_MIN_VERSION, so without it this guard cannot say
    which scanner it is about to run — and an unidentified scanner is exactly
    what it exists to refuse.
    Restore it from the kit:  10-repo-init.sh --path . --no-remote"
# shellcheck source=scripts/gitleaks-version.env
# shellcheck disable=SC1091  # resolved at runtime; the source= directive above covers -x runs
. "$VERSION_ENV"

if ! command -v gitleaks >/dev/null 2>&1; then
  die "gitleaks is not on PATH.
    This repo's secret scan cannot run, and an unrun scan is not a clean scan.
    Install:  brew install gitleaks"
fi

raw_version=$(gitleaks version 2>/dev/null) || die "\`gitleaks version\` exited non-zero"

# 8.x prints a bare '8.30.1'; other builds prefix a 'v' or add build metadata.
# Take the first semver-shaped token from whatever it printed.
found=$(printf '%s' "$raw_version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)

# Fail CLOSED on unparseable output. An unrecognised version is exactly the case
# this guard exists for -- treating it as "probably fine" would reintroduce the bug.
[ -n "$found" ] && [ -n "${GITLEAKS_MIN_VERSION:-}" ] || die "could not determine the gitleaks version.
    \`gitleaks version\` printed: ${raw_version:-<nothing>}
    Refusing to scan with an unidentified binary."

# `sort -V` is the comparison, so its ABSENCE has to be a named failure rather than
# a shell diagnostic. Without this probe an unusable -V made the pipeline fail under
# errexit and the guard died printing `sort: illegal option -- V` and exiting 2 --
# naming neither this script nor what it was comparing, which is precisely the
# anonymous failure die() exists to replace. Verified with a sort shim rejecting -V.
# (It works on macOS's BSD sort and on GNU sort; this guards the minimal-userland
# case, and costs one comparison per run.)
# The pair matters. `1.0.0 / 1.0.1` sorts identically whether -V is honoured or
# silently ignored, so accepting the OPTION would have been mistaken for having
# the BEHAVIOUR. `1.9.0 / 1.10.0` is the smallest pair where the two disagree:
# lexicographic puts 1.10.0 first, version-aware puts 1.9.0 first. That distinction
# is the whole floor check -- with a lexicographic fallback, floor 8.30.1 sorts
# before a found 8.9.0, so a BELOW-floor gitleaks would read as ACCEPT. Fail open,
# in the guard whose entire job is to fail closed.
if [ "$(printf '1.10.0\n1.9.0\n' | sort -V 2>/dev/null | head -n1)" != "1.9.0" ]; then
  die "this system's \`sort\` cannot order versions (-V absent or ignored).
    Refusing to guess whether gitleaks meets the ${GITLEAKS_MIN_VERSION} floor.
    On macOS, Homebrew coreutils installs GNU sort as \`gsort\` WITHOUT shadowing
    \`sort\`, so installing it alone does not change what this guard invokes:
    also put \$(brew --prefix coreutils)/libexec/gnubin on PATH, or run the scan
    on a system whose sort supports -V. (Not yet observed on any fleet machine --
    macOS's own BSD sort passes the ordering probe above.)"
fi

# sort -V puts the lower version first. If the floor sorts first, we are at or above it.
lowest=$(printf '%s\n%s\n' "$GITLEAKS_MIN_VERSION" "$found" | sort -V | head -n1)
[ "$lowest" = "$GITLEAKS_MIN_VERSION" ] || die "gitleaks $found is older than the required $GITLEAKS_MIN_VERSION.
    Allowlist semantics differ across versions, so the coverage documented in
    .gitleaks.toml does not hold on this binary.
    Upgrade:  brew upgrade gitleaks"

# Assertion-only mode: callers that just want the version gate.
[ "$#" -gt 0 ] || { printf '✓ gitleaks %s (floor %s)\n' "$found" "$GITLEAKS_MIN_VERSION"; exit 0; }

exec gitleaks "$@"
