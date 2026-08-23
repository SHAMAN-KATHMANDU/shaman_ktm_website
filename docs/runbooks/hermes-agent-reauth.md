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

## READ THIS BOX BEFORE YOU RUN ANYTHING

**Both of these fail silently. Neither shows you an error — you will think it
worked, and it will not have.** They are the only two ways this goes wrong.

> **1. Start the reconnect ON `ubu2`. Not from the website.**
> The consent screen only opens when the script asks for it. Going to the site
> and looking for a "reconnect" button will not work — visiting the consent
> page directly just says *"Missing request_id — start the connection from your
> MCP client."* **Order: run the command on `ubu2` first, then approve in the
> browser.** Never the other way round.
>
> **2. The browser you approve in must also be on `ubu2`.**
> Hermes registered its callback as a loopback address on `ubu2`. **If you
> approve on your Mac or your phone, the consent screen will appear, you will
> click approve, and it will look like it worked — and nothing will have been
> saved.** The loop will carry on and you will come back saying it is still
> broken, and you will be right. If `ubu2` has no desktop browser, run this on
> your Mac **before** step 3, leave it open, and do the approving in your Mac's
> browser — the tunnel makes your Mac's `127.0.0.1:60781` mean `ubu2`'s:

```
ssh -L 60781:127.0.0.1:60781 YOUR_USERNAME@ubu2
```

> Replace `YOUR_USERNAME` with your login on `ubu2` — the name you normally
> `ssh` in with. Leave that terminal open for the whole of step 3.

**Revoking from the website will not help.** Every Hermes token there is
already revoked — that is *why* it is looping. There is nothing left to switch
off on the site side.

## 1. Find what is running it, on `ubu2`

**UNVERIFIED — we cannot reach `ubu2`, so we do not know what the job is
called or which scheduler runs it.** Everything in this step is a search, not a
name we are handing you. **Whatever these commands turn up is the real answer**,
and you use that name for the rest of the runbook. Anywhere below that says
`NAME` or `/path/from/step/1`, substitute what you found here.

Run all five, on `ubu2`:

```
crontab -l | grep -i -E 'hermes|shaman'
sudo crontab -l | grep -i -E 'hermes|shaman'
systemctl --user list-timers --all | grep -i -E 'hermes|shaman'
systemctl list-timers --all | grep -i -E 'hermes|shaman'
sudo grep -rl 'shamankathmandu' /etc/cron.d /etc/cron.* /etc/systemd ~/.config/systemd 2>/dev/null
```

**Both `crontab -l` lines matter** — your own crontab and root's are different
lists, and a job in one does not appear in the other. Same for the two
`list-timers` lines: `--user` and system timers are separate.

**What you are looking for:** an entry that runs **every 15 minutes** — a `*/15`
in a cron line, or `15min` in a timer. It makes **two** attempts each cycle, so
it is either one job that retries once or two jobs on the same schedule. **If
you find two, both have to stop.**

Write down two things before moving on:

- **the job's name** (the timer name, or the cron line), and
- **the script it runs** — the path at the end of the cron line, or:

```
systemctl cat NAME.timer NAME.service
```

replacing `NAME` with what you found. That prints the service file, and the
`ExecStart=` line in it is the script's full path. **You need that path in
step 3.**

## 2. Stop it

**Use the name from step 1.** If it was a cron line:

```
crontab -e
```

Put a `#` at the start of the Hermes line and save. **Comment it out, do not
delete it** — you want it back in step 3. If it was in root's crontab, use
`sudo crontab -e` instead.

If it was a timer:

```
sudo systemctl disable --now NAME.timer
```

(or `systemctl --user disable --now NAME.timer` if it was a user timer).

**Confirm it is actually stopped before going on.** On `ubu2`:

```
date; sleep 960; date
```

That waits sixteen minutes — one full cycle plus a minute. **What you should
see:** nothing new from Hermes in that window. If you would rather check it
properly, leave this running in another terminal instead and watch it stay
silent:

```
journalctl --user -f -u NAME.service
```

## 3. Re-authorise it

**This is the step the two warnings at the top are about. Re-read them.**

Run the script you found in step 1 in whatever way makes it authorise. **We
cannot tell you the exact flag — we have never seen this script, and guessing
one would waste your evening.** To find it, on `ubu2`:

```
SCRIPT=/path/from/step/1
"$SCRIPT" --help 2>&1 | head -40
grep -n -i -E 'auth|login|token|oauth|--' "$SCRIPT" | head -20
```

Replace `/path/from/step/1` with the `ExecStart=` path you wrote down. **Look
for a subcommand or flag with `auth`, `login` or `connect` in the name.** If
`--help` shows nothing useful, the second command lists the script's own
options and the place it stores its token.

When you run it, it will:

1. print a URL, or open one,
2. take you to the site's login — sign in as you normally do,
3. show a consent screen naming **Hermes Agent** and asking which role to
   grant. **Pick the lowest role that lets the script do its job.** Only choose
   `owner` if you know it needs to change things,
4. redirect back to `ubu2` and save a fresh token.

**Expect a NEW entry, not the old one waking up.** Hermes registers itself
fresh every time and picks a new callback port, so afterwards there will be one
more "Hermes Agent" in the connections list. That is normal and correct. The
four older Hermes entries are dead; you can leave them or revoke them at
**Sysuser → MCP Connections**, and either way it changes nothing about the loop.

Then turn the job back on — uncomment the cron line, or:

```
sudo systemctl enable --now NAME.timer
```

## 4. Confirm it worked — one check, on `ubu2`, straight away

**Do not wait and see whether the log quietens. Watch one cycle, once.** On
`ubu2`, right after re-enabling the job:

```
journalctl --user -f -u NAME.service
```

(drop `--user` for a system timer; if it is a cron job, use
`tail -f /var/log/syslog | grep -i CRON` instead).

**What you should see:** within fifteen minutes the job wakes up, runs, and
finishes **without an authentication error** — no `401`, no `invalid_grant`, no
`refresh` failure. **One clean run is the whole confirmation.** If the very
next run still shows an auth error, the token did not save: that is the
loopback-browser catch at the top of this page, and you need to redo step 3
with the tunnel.

**Then check it from the website**, on any device:

**Sysuser → Activity.** **What you should see:** the repeating
`refresh-token reuse detected` lines **stop appearing**. Look at the newest
entry's time — if nothing new has arrived for twenty minutes, it is fixed.

**Look for it by the name "Hermes Agent", not by anything else.** We have been
identifying this loop by the machine's network address, and that address changed
by itself part-way through the day — so counting that way undercounts it and can
make a live loop look finished.

**Sysuser → MCP Connections.** **What you should see:** a new **Hermes Agent**
entry, not revoked.

**If refusals are still arriving after thirty minutes,** the old job is still
running somewhere: go back to step 1 and check the list you did *not* find it in
the first time — your crontab versus root's, a user timer versus a system one, or
the second of two jobs on the same schedule.

## What we could not do, and why

- **We cannot reach `ubu2`.** It is on your network; the site only ever sees it
  arriving from outside. Every step above has to be run by you, on that machine.
- **We do not touch credentials.** Minting or moving a token for you is not
  something we do, even where we could.
- **We changed nothing on the production server** to write this. Everything
  above was read, not altered.
- **We could not verify the job's name, its scheduler, or the script's
  authorise command** — all three live on `ubu2`. They are marked UNVERIFIED in
  step 1 and step 3, with the commands that reveal them, rather than guessed at.
  A guessed service name that does not exist costs you an evening; a search that
  takes thirty seconds does not.

## For whoever reads this later

The site behaved correctly throughout: the loop is a client retrying a token
that reuse-detection had already killed, and the repeated refusals are the
protection working. Two things made it invisible for five weeks — the refusals
looked like ordinary log lines rather than an alert, and the client's source
address changed part-way through any given day (the machine's address is not
static), so counting by address undercounts it. **Count by client, not by
address.**
