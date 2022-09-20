import dbin from "../mod.ts";

const binfile = await dbin({
  pattern:
    "https://github.com/sass/dart-sass/releases/download/{version}/dart-sass-{version}-{target}.tar.gz",
  version: "1.54.9",
  targets: [
    { name: "linux-x64", os: "linux", arch: "x86_64" },
    { name: "linux-arm64", os: "linux", arch: "aarch64" },
    { name: "macos-x64", os: "darwin", arch: "x86_64" },
    { name: "macos-arm64", os: "darwin", arch: "aarch64" },
    { name: "windows-x64", os: "windows", arch: "x86_64" },
  ],
  dest: "./_bin/sass",
});

console.log({ binfile });
