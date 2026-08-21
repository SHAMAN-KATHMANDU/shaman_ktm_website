# Runbook — stop the Hermes Agent refresh loop on `ubu2`

**Status when this was written:** still firing. Nothing is breached. This is
yours to run, on `ubu2` — nobody else can reach that machine.

## What is happening

A script on `ubu2` called **Hermes Agent** connected to the site's MCP API on
14 July and was given a refresh token. That token is dead. The script never
noticed, so twice every fifteen minutes it asks the site for a new one, is
refused, and tries again — and has been doing that for five weeks. Every
refusal is written to the admin activity log, and those refusals are now
**76% of everything in it**, which is why real changes are hard to find there.
Nothing is exposed: the site is correctly saying no every time. It is noise,
not a breach — but the noise is burying the log you would use to spot a real
problem.

## Before you start — the two things that make this different

**1. You cannot start the re-authorisation from the website.** The consent
screen only opens when the script asks for it. Visiting it directly shows
*"Missing request_id — start the connection from your MCP client."* So the
order is: **start the flow on `ubu2`, then approve in the browser.** Not the
other way round.

**2. The browser you approve in must be running on `ubu2` itself.** Hermes
registered its callback as a loopback address on `ubu2`, so the final redirect
only lands if the browser is on that machine. Approving on your phone or laptop
will log you in, show the consent screen, and then fail at the last step. If
`ubu2` has no desktop, tunnel it from your laptop first:

```
ssh -L 60781:127.0.0.1:60781 <you>@ubu2
```

and then use `http://127.0.0.1:60781/...` in your local browser.

**Revoking from the website will not help.** Every Hermes token there is
already revoked — that is *why* it is looping. There is nothing left to switch
off on the site side.

## 1. Find what is running it, on `ubu2`

```
crontab -l | grep -i -E 'hermes|shaman'
systemctl list-timers --all | grep -i -E 'hermes|shaman'
systemctl --user list-timers --all | grep -i -E 'hermes|shaman'
grep -rl 'shamankathmandu' /etc/cron.d /etc/cron.* ~/.config/systemd 2>/dev/null
```

The schedule is **every 15 minutes**, and it makes **two** attempts each time,
so expect a `*/15` entry — and expect either one job that retries once, or two
jobs on the same schedule. **Note which it is; if there are two, both need
stopping.**

Whatever it is will have a stored token file next to it. Find that too — you
will overwrite it in step 3.

## 2. Stop it

```
crontab -e            # comment the line out, do not delete it yet
# or, if it is a timer:
sudo systemctl disable --now <name>.timer
```

Confirm it is quiet: **wait until the next quarter hour passes with no new
attempt** (see step 4 for how to watch). Stopping it first means the log stops
filling while you do the rest.

## 3. Re-authorise it

Run whatever command first connected Hermes to the site — the one that opened a
browser back in July. It will:

1. register itself with the site again and print a URL,
2. open the site's login, where you sign in as usual,
3. show the consent screen naming **Hermes Agent** and asking which role to
   grant — **choose the lowest role that lets the script do its job**, and only
   pick `owner` if you know it needs it,
4. redirect back to `ubu2` and store a fresh token.

**Expect a new entry to appear, not the old one to come back to life.** Hermes
registers itself fresh on each run and picks a new callback port each time, so
after this there will be one more "Hermes Agent" in the connections list. That
is normal. The older Hermes entries are dead and can be left alone or revoked
at **Sysuser → MCP Connections**; revoking them changes nothing about the loop.

Put the new token wherever the job reads it, then re-enable the job you
commented out in step 2.

## 4. Confirm it worked, from the website

Two checks, both from your phone if you like:

- **Sysuser → Activity.** The repeating `refresh-token reuse detected` lines
  stop appearing. Give it 15 minutes — one full cycle — before believing it.
- **Sysuser → MCP Connections.** The new Hermes entry is listed and not
  revoked.

If the lines are still appearing after 30 minutes, the old job is still running
somewhere: go back to step 1 and check the *other* scheduler (a `cron` entry
when you disabled a timer, a root crontab when you edited your own, or the
second of two jobs).

## What we could not do, and why

- **We cannot reach `ubu2`.** It is on your network; the site only ever sees it
  arriving from outside. Every step above has to be run by you, on that machine.
- **We do not touch credentials.** Minting or moving a token for you is not
  something we do, even where we could.
- **We changed nothing on the production server** to write this. Everything
  above was read, not altered.

## For whoever reads this later

The site behaved correctly throughout: the loop is a client retrying a token
that reuse-detection had already killed, and the repeated refusals are the
protection working. Two things made it invisible for five weeks — the refusals
looked like ordinary log lines rather than an alert, and the client's source
address changed part-way through any given day (the machine's address is not
static), so counting by address undercounts it. **Count by client, not by
address.**
