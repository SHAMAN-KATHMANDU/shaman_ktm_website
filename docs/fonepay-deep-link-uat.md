# UAT item — Fonepay bank-app deep link: does the customer have a way out?

> **Status: NOT SCHEDULED.** HIVE-23 is parked on the human's *"wait for a while"*. This item is written so it
> is correct when he lifts it. It authorises nothing.

## Before the first tap — declare the revision

Write this down **before touching the handset**. If it is not filled in, the result of the test is not
interpretable, whichever way it comes out.

```
Device / OS / browser: ______________________
Build under test:      [ ] CONTROL — no fallback      [ ] TREATMENT — fallback present
How I confirmed which: ______________________  (see "Telling the builds apart", below)
```

**Why this line exists.** The fallback lives only on the branch `fix/fonepay-bank-app-fallback`. It is **not on
`main`**, and production runs `main`. A tester who taps a bank on the live site will correctly see the customer
stranded — and that is the *pre-existing bug*, not a failure of the fix. Without the revision declared in
advance, the same tap, with the same outcome, supports opposite conclusions.

**Do not identify the build by commit hash.** Three hashes have circulated for this one fix and only the newest
is reachable on the remote; the other two exist only in one agent's local object store. The branch will also be
rebased before it merges, which changes the hash again. **Identify the build by branch plus observable
behaviour.** A hash is only safe to quote once it is on `main`.

## What is being tested

Tapping a bank in the mobile list runs `window.location.href = "<bankscheme>://…"`. A custom URL scheme with no
installed handler is a trapdoor: the browser reports neither success nor failure, so the page cannot detect a
missing app. Compounding it, the bank list is mobile-only and the QR card is collapsed behind a "Show QR code"
toggle while that list is showing — **so the QR is hidden at the exact moment a stranded customer needs it.**

The fix does not attempt detection. It reveals the QR on tap, so the bad case is recoverable without knowing
which case you are in.

## The two runs — neither means anything alone

**Control without treatment reads as "broken". Treatment without control reads as "nothing was ever wrong."**

### CONTROL — executable today
- Build: **without** the fallback. The live site qualifies.
- Steps: open the Fonepay pay page on a phone → in the bank list, tap a bank whose app is **not installed**.
- Expected: nothing opens, and **no QR is visible without tapping the toggle**. Customer is stranded.
- **This is the control. It establishes the trapdoor is real. It is NOT a defect in the fix — do not file it as one.**

### TREATMENT — **not executable today**
- Build: carrying the fallback, from branch `fix/fonepay-bank-app-fallback`.
- Steps: identical.
- Expected: the deep link is still attempted, **and the QR becomes visible without tapping the toggle**, so the
  customer can scan and complete payment.

**Why it cannot be run right now, stated plainly rather than described as if it could:**
1. No PR is open and nothing is merged.
2. **This repo has no staging environment** — `deploy/` contains only `prod`, and the image workflow fires only
   on push to `main`, so **merging to `main` IS the deploy**. No deployed build anywhere carries the fallback.
3. HIVE-23 is parked, so the Fonepay credentials the flow needs are unavailable regardless.

**What would make it executable:** a local build from that branch with the handset on the same network — with
two caveats that must be recorded if that route is taken: a LAN dev build serves **http**, which is not the
scheme the deep-link behaviour lives under in production; and the credential blocker above still applies. The
cleaner path is to run it after the branch merges to `main`, which is also when a commit hash becomes safe to
quote.

## Telling the builds apart, by behaviour rather than by hash

On the pay page, with the bank list showing, **tap a bank whose app is not installed**:
- **QR still hidden behind the toggle → CONTROL build** (no fallback).
- **QR visible without tapping the toggle → TREATMENT build** (fallback present).

## What would falsify the fix

Worth stating so the test can genuinely come back negative:
- On a treatment build, the QR does **not** appear after the tap.
- **The page navigates away** — some Android Chrome versions go to `ERR_UNKNOWN_URL_SCHEME` rather than
  no-opping. If that happens the page unloads and takes the settlement polling loop with it, and **no in-page
  fallback of any design survives it — including this one.** This is the single most valuable thing the handset
  run can tell us, and nothing short of a real device can answer it.
- The QR appears but is unscannable, or scanning it does not settle the order.

## Not verified by anyone, at time of writing

No iOS device, no Android device, no emulator, and no browser has run this page. Every statement above about
what a custom scheme does with no installed handler is read from source and platform documentation, not measured.
