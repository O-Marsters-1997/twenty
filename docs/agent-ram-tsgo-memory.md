# tsgo peak memory: can a setting cap it?

Measured with `/usr/bin/time -l tsgo -p tsconfig.json --noEmit`, one run at a time, on a 16 GB Mac,
after building twenty-shared, twenty-ui, twenty-emails and twenty-sdk. One run per cell, so treat
differences under about 15% as noise.

| Package | Setting | Peak RSS | Wall time |
|---|---|---|---|
| twenty-front | default | 3.7 GB | 9.0 s |
| twenty-front | `GOMEMLIMIT=3GiB` | 4.5 GB | 11.6 s |
| twenty-front | `--singleThreaded` | 3.8 GB | 13.0 s |
| twenty-server | default | 3.7 GB | 17.2 s (cold; 5-14 s elsewhere) |
| twenty-server | `GOMEMLIMIT=3GiB` | 4.0 GB | 4.9 s |
| twenty-server | `--singleThreaded` | 4.1 GB | 5.9 s |

twenty-front exits with 89 type errors in this worktree (generated GraphQL files absent); twenty-server
exits clean. Memory was the same shape as a clean run.

## Result

No setting lowers peak RSS. `GOMEMLIMIT` is a soft GC target and the working set exceeds 3 GiB, so
it only adds GC work. `--singleThreaded` is slower on front and no smaller. The earlier 5-6 GB
figures were from runs with missing built dependencies; with them built, peak is about 3.7 GB.

`scripts/heavy` is unchanged. Queueing typechecks behind the lock is the only effective cap: it
bounds concurrent tsgo processes, not the memory of each one.
