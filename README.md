# Dbin

TypeScript library to download binary files from GitHub releases detecting the
correct platform. Example:

```ts
import dbin from "https://deno.land/x/dbin/mod.ts";

const binfile = await dbin({
  pattern:
    "https://github.com/CloudCannon/pagefind/releases/download/{version}/pagefind-{version}-{target}.tar.gz",
  version: "v0.8.1",
  targets: [
    { name: "x86_64-unknown-linux-musl", os: "linux", arch: "x86_64" },
    { name: "x86_64-apple-darwin", os: "darwin", arch: "x86_64" },
    { name: "x86_64-pc-windows-msvc", os: "windows", arch: "x86_64" },
  ],
  dest: "./_bin/pagefind",
});
```

This function does the following:

- Detects the current target (for example, for `linux` and `x86_64` the target
  is `x86_64-unknown-linux-musl`).
- Replace the variables `{version}` and `{target}` in the `pattern`url.
- Download the file.
- It also download the `.sha256` file and check the `SHA-256 checksum`.
- Decompress the `.tar.gz` file.
- Output to the `dest` file (`./_bin/pagefind` in the example). If the current
  os is Windows, the `.exe` extension is appended to the file name.
- Change the output file permissions to `0o764` (except in Windows). Set the
  `chmod` option for other value compatible with
  [Deno.chmod](https://doc.deno.land/deno/stable/~/Deno.chmod).
- Returns the full path to the executable file.
- If the function is executed again, and the dest file exists, it does nothing.
  Set `override: true` to download the file again.
