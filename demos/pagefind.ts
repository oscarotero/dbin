import dbin from "../mod.ts";

const binfile = await dbin({
  pattern:
    "https://github.com/CloudCannon/pagefind/releases/download/{version}/pagefind-{version}-{target}.tar.gz",
  checksumPattern:
    "https://github.com/CloudCannon/pagefind/releases/download/{version}/pagefind-{version}-{target}.tar.gz.sha256",
  version: "v1.3.0",
  targets: [
    { name: "x86_64-unknown-linux-musl", os: "linux", arch: "x86_64" },
    { name: "aarch64-apple-darwin", os: "darwin", arch: "aarch64" },
    { name: "x86_64-pc-windows-msvc", os: "windows", arch: "x86_64" },
  ],
  dest: "./_bin/pagefind",
});

new Deno.Command(binfile, {
  stdout: "inherit",
  args: ["-h"],
}).outputSync();
