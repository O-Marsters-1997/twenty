# tsgo peak memory settings

Measured with `/usr/bin/time -l tsgo -p tsconfig.json --noEmit`, one run at a time, on a 16 GB Mac,
after building twenty-shared, twenty-ui, twenty-emails and twenty-sdk. One run per cell, so
differences under about 15% are noise.

| Package | Setting | Peak RSS | Wall time | User CPU |
|---|---|---|---|---|
| twenty-front | default | 3.7 GB | 9.0 s | 24.6 s |
| twenty-front | `GOMEMLIMIT=3GiB` | 4.5 GB | 11.6 s | 70.9 s |
| twenty-front | `--singleThreaded` | 3.8 GB | 13.0 s | 16.0 s |
| twenty-server | default (first run) | 3.7 GB | 17.2 s | 37.1 s |
| twenty-server | default (repeat) | 3.3 GB | 3.3 s | 10.4 s |
| twenty-server | `GOMEMLIMIT=3GiB` | 4.0 GB | 4.9 s | 27.2 s |
| twenty-server | `--singleThreaded` | 4.1 GB | 5.9 s | 7.5 s |

twenty-front reports 89 type errors in this worktree (generated GraphQL files absent), so its
figures are approximate. twenty-server exits clean. The server default's first run was slow, so
compare wall times against the repeat.

## Result

No setting lowers peak RSS. Every non-default cell is equal or higher; the server deltas are within
noise. `GOMEMLIMIT=3GiB` is a soft GC target below the working set, so it only adds GC work (front
user CPU triples). `--singleThreaded` is slower on front and no smaller.

`scripts/heavy` is unchanged. The lock bounds how many tsgo processes run at once, not the memory of
each one.
