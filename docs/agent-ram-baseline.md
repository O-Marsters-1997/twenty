# Agent RAM baseline

Recorded 2026-11-03 on `main` (no `scripts/heavy`, no memory caps), for comparison in #27.

## Machine

- 16 GB RAM, macOS, 2 GB swap file at start (0.9 GB used), 55% free by `memory_pressure`
- Background apps: Chrome (several processes, ~1.7 GB), a Virtualization.framework VM (~0.75 GB),
  Docker, Spotify (~0.3 GB), cmux, 3 Claude Code sessions (~0.3 to 0.5 GB each), Spotlight (`mds_stores`)
- 4 worktrees checked out (main + issue-4, 5, 6) after pruning merged ones in #25

## Session

Four raw `npx tsgo -p tsconfig.json --noEmit` processes started at once, no lock (what 4 agents
typechecking together do). Sampled `memory_pressure` and swap every second.

| Process | Wall time | Peak RSS |
|---|---|---|
| twenty-front (main) | 116 s | 2.6 GB |
| twenty-server (main) | 69 s | 1.7 GB |
| twenty-front (issue-5 worktree) | 127 s | 3.5 GB |
| twenty-server (issue-6 worktree) | 80 s | 1.6 GB |

Run alone, the same typechecks took 6.8 s (front) and 9.3 s (server).

## Result

- Free memory fell from 55% to a low of 3% during the run.
- Swap used rose from 0.9 GB to 9.5 GB at peak, and was 3.6 GB when the run ended.
- Typechecks took 12 to 19 times longer than solo, which is swap thrash.
- The machine did not freeze outright; the terminal stayed responsive but slow.
## Limits

- Only tsgo was run. No jest, so peak with 4 agents typechecking and testing is likely worse.
- `time -l` reports the `npx` tree's largest process, so per-process RSS is lower than the
  5.3 GB / 5.9 GB measured in the planning conversation.
- The worktrees for issue-5 and issue-6 have in-progress edits, so typecheck reported errors. That
  does not change memory use materially.
- Activity Monitor was not captured; `memory_pressure` and `sysctl vm.swapusage` were used.
