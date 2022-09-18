import {
  dirname,
  join,
  resolve,
} from "https://deno.land/std@0.139.0/path/mod.ts";
import { Untar } from "https://deno.land/std@0.139.0/archive/tar.ts";
import { copy } from "https://deno.land/std@0.139.0/streams/conversion.ts";

type OS = "linux" | "darwin" | "windows";
type Arch = "x86_64" | "aarch64";

export interface Options {
  /** Pattern to build the final URL download. It can contains {version} and {target} placeholders. */
  pattern: string;

  /** Version to download. It's used to replace the {version} placeholder in the pattern. */
  version: string;

  /** List of different targets. */
  targets: Target[];

  /** Path to save the binary file. In Windows environments, the extension ".exe" is appended automatically. */
  dest: string;

  /** Set true to override the binary file, if it already exists */
  overwrite?: boolean;

  /**
   * The permissions applied to the binary file (ignored by Windows)
   * @see https://doc.deno.land/deno/stable/~/Deno.chmod
   */
  chmod?: number;

  /** To force a specific OS, instead of getting it from Deno.build.os */
  os?: OS;

  /** To force a specific arch, instead of getting it from Deno.build.arch */
  arch?: Arch;
}

export interface Target {
  name: string;
  os: OS;
  arch: Arch;
}

export default async function downloadBin(options: Options): Promise<string> {
  const dest = Deno.build.os === "windows"
    ? resolve(options.dest) + ".exe"
    : resolve(options.dest);

  // Check if the file already exists and return the path
  try {
    await Deno.stat(dest);
    if (!options.overwrite) {
      console.log(`Using binary file at ${dest}`);
      return dest;
    }
  } catch {
    // File does not exist
  }

  // Detect the target
  const os = options.os ?? Deno.build.os;
  const arch = options.arch ?? Deno.build.arch;
  const target = options.targets.find((target) =>
    target.os === os && target.arch === arch
  );

  if (!target) {
    throw new Error("No target found");
  }

  // Download the tarball
  const url = options.pattern
    .replaceAll("{target}", target.name)
    .replaceAll("{version}", options.version);

  const tmp = await Deno.makeTempDir();

  await download(new URL(url), join(tmp, "tmp.tar.gz"));

  // Extract the binary
  const tgz = await Deno.open(join(tmp, "tmp.tar.gz"));
  const tar = await Deno.create(join(tmp, "tmp.tar"));

  await tgz.readable
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(tar.writable);

  const reader = await Deno.open(join(tmp, "tmp.tar"), { read: true });
  const untar = new Untar(reader);

  try {
    await Deno.mkdir(dirname(dest), { recursive: true });
  } catch {
    // Directory exists
  }

  // Copy the first binary file found in the tarball
  for await (const entry of untar) {
    if (entry.type === "directory") {
      continue;
    }

    const file = await Deno.create(dest);
    await copy(entry, file);
    file.close();
    break;
  }
  reader.close();
  await Deno.remove(tmp, { recursive: true });

  // Change file permissions
  try {
    if (options.chmod) {
      await Deno.chmod(dest, options.chmod);
    } else {
      await Deno.chmod(dest, 0o764);
    }
  } catch {
    // Not supported on Windows
  }
  return dest;
}

async function download(url: URL, dest: string): Promise<void> {
  console.log(`Downloading ${url}...`);

  const blob = await (await fetch(url)).blob();
  const sha256sum = await (await fetch(url.href + ".sha256")).text();
  const content = new Uint8Array(await blob.arrayBuffer());

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
