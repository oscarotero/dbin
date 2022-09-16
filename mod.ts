import { dirname, join } from "https://deno.land/std@0.139.0/path/mod.ts";
import { Untar } from "https://deno.land/std@0.139.0/archive/tar.ts";
import { copy } from "https://deno.land/std@0.139.0/streams/conversion.ts";

export interface Options {
  pattern: string;
  version: string;
  targets: Target[];
  dest: string;
  overwrite?: boolean;
}

export interface Target {
  name: string;
  os: "darwin" | "linux" | "windows";
  arch: "x86_64" | "aarch64";
}

export default async function downloadBin(options: Options) {
  try {
    await Deno.stat(options.dest);
    if (!options.overwrite) {
      return;
    }
  } catch {
    // File does not exist
  }

  const target = options.targets.find((target) => {
    return target.os === Deno.build.os && target.arch === Deno.build.arch;
  });

  if (!target) {
    throw new Error("No target found");
  }

  const url = options.pattern
    .replaceAll("{target}", target.name)
    .replaceAll("{version}", options.version);

  console.log(`Downloading ${url}...`);
  const tmp = await Deno.makeTempDir();

  await download(new URL(url), join(tmp, "tmp.tar.gz"));

  const tgz = await Deno.open(join(tmp, "tmp.tar.gz"));
  const tar = await Deno.create(join(tmp, "tmp.tar"));

  await tgz.readable
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(tar.writable);

  const reader = await Deno.open(join(tmp, "tmp.tar"), { read: true });
  const untar = new Untar(reader);

  try {
    await Deno.mkdir(dirname(options.dest), { recursive: true });
  } catch {
    // Directory exists
  }

  for await (const entry of untar) {
    if (entry.type === "directory") {
      continue;
    }

    const file = await Deno.create(options.dest);
    await copy(entry, file);
    file.close();
    await Deno.chmod(options.dest, 0o764);
    break;
  }
  reader.close();
  await Deno.remove(tmp, { recursive: true });
}

async function download(url: URL, dest: string): Promise<void> {
  const blob = await (await fetch(url)).blob();
  const sha256sum = await (await fetch(url.href + ".sha256")).text();
  const content = new Uint8Array(await blob.arrayBuffer());

  try {
    await Deno.mkdir(dirname(dest), { recursive: true });
  } catch {
    // Directory exists
  }

  await checkSha256sum(content, sha256sum);
  await Deno.writeFile(dest, content);
}

async function checkSha256sum(
  content: Uint8Array,
  sha256sum: string,
): Promise<void> {
  const hash = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  sha256sum = sha256sum.split(/\s+/).shift()!;

  if (hashHex !== sha256sum) {
    throw new Error("SHA-256 checksum mismatch");
  }
}
