# How to patch a dependency

Patches live in this directory and are registered under `patchedDependencies` in the root `package.json`.

## New patch

```bash
bun patch <package-name>@<version>
# Edit the files in node_modules/<package-name>, then:
bun patch --commit node_modules/<package-name>
```

Name the patch file `<package-name>@<version>.patch` (a scoped name uses `-` for `/`) and register it:

```
"patchedDependencies": {
  "<package-name>@<version>": "patches/<package-name>@<version>.patch"
}
```

## Updating an existing patch

Run `bun patch <package-name>@<version>` again, edit the files, and commit with `bun patch --commit`.
