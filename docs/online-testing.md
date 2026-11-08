# Testing online play

How to test online matches on the dev server (`npm run dev`), and what was last checked. Everything below is dev-only
and isn't in a published build.

## Two players on one computer

1. Open the game in two browser tabs or windows.
2. Tab A: **Play → Online → Host a game**. Copy the room code.
3. Tab B: **Play → Online**, type the code, **Join**.
4. Both pick a deck and press **Ready**. The coin flip, setup and turns then run as in a real match: each screen only
   acts on its own turns.

## Test tools (browser console, either tab)

| Command | What it does |
|---|---|
| `__evilGame.lag(400, 300)` | Holds every message this tab sends for 400 ms plus up to 300 ms more (in order). `lag(0)` turns it off. Set it in both tabs. |
| `__evilGame.drop()` | Cuts the link without a goodbye, like losing the network. Both screens should reconnect by themselves. |
| `__evilGame.breakLog()` | This tab loses track of the log, so the next turn handed to it is refused. The sender should resync the whole match. |
| `__evilGame.scenarios()` | Lists the test boards. |
| `__evilGame.scenario('name')` | Puts a test board on the table (Player 1 to act) and sends it to the other tab. Returns what to do next. |
| `__evilGame.fingerprint()` | The match's fingerprint. Both tabs should show the same one whenever neither is mid-action. |
| `__evilGame.room()` | This tab's room: code, role, connection status and seat. |

The scenario boards are in [src/dev/onlineScenarios.ts](../src/dev/onlineScenarios.ts): `holdTheGate`, `readySpell`,
`reassemble`, `defenderScry`, `defenderLoot`, `fieldNotes`.

## Last run (2026-11-07, two tabs, lag 400 ms + up to 300 ms on both)

| Check | Result |
|---|---|
| Lobby, fair seed, deal and coin flip | Passed: same state on both screens |
| Setup turns, Start, then a move-and-draw turn each | Passed: fingerprints matched after every handoff |
| Hold the Gate (defender's choice, 3 s timer) | Passed |
| Ready Spell interrupt (offer, takeover, hand back, move resumes) | Passed |
| Reassemble (discard, then back-row tile, on the other screen) | Passed |
| Defender's scry (Blind Seer's Preemptive Counter) | Passed |
| Field Notes on the opponent's deck (stays with its user; card name private in the log) | Passed |
| Defender's loot (Dreadnought Privateer's Iron Clout) | Passed (2026-11-08, no lag), after fixing attack loots (see below) |
| Popup order chosen by the other player | Not tested: no board found that triggers it |
| Network drop mid-turn, with unsent progress | Passed: reconnected by itself; the acting screen's progress was kept |
| Guest reloads mid-turn, rejoins from the lobby | Passed |
| Host reloads, rejoins from the lobby (guest keeps retrying) | Passed, after fixing a bug where a failed retry ended the match |
| Forced log mismatch | Passed: handoff refused, whole match resent, fingerprints matched |
| Concede, by the waiting player and by the acting player | Passed |

## Fixed along the way

- **Loot passives on attacks never triggered** (Short Fuse, Spoils, Twin Fury, Iron Clout, Magnetized Plunder on the main
  attack path): the attack worked them out inside a board update that React runs on the next render, after the code
  that reads them. That update now runs at once. Iron Clout also now triggers for the defender on multi-step and area
  attacks.
