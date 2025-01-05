import { dirname } from "jsr:@std/path@1.0.8/dirname";
import { UntarStream } from "jsr:@std/tar@0.1.4/untar-stream";

type OS = "linux" | "darwin" | "windows";
type Arch = "x86_64" | "aarch64";

export interface Options {
  /** Pattern to build the final URL download. It can contains {version} and {target} placeholders. */
  pattern: string;

  /** Checksum pattern */
  checksumPattern?: string;

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
  arch?: Arch;
}

export default async function main(options: Options): Promise<string> {
  // Detect the target
  const os = options.os ?? Deno.build.os;
  const arch = options.arch ?? Deno.build.arch;
  const target = options.targets.find((target) =>
    target.os === os && (!target.arch || target.arch === arch)
  );

  if (!target) {
    throw new Error(`No binary found for your platform (${os}/${arch})`);
  }

  const version = options.version;

  // Set the destination name
  const dest = `${options.dest}-${version}-${target.name}`;

  // Check if the file already exists and return the path
  try {
    await Deno.stat(dest);
    if (!options.overwrite) {
      return dest;
    }
  } catch {
    // File does not exist
  }

  // Generate the download URLs
  const url = options.pattern
    .replaceAll("{target}", target.name)
    .replaceAll("{version}", options.version);

  const checksumUrl = options.checksumPattern?.replaceAll(
    "{target}",
    target.name,
  )?.replaceAll("{version}", options.version);

  // Download the file
  const file = await download(new URL(url), checksumUrl);

  // Save the binary
  try {
    await Deno.mkdir(dirname(dest), { recursive: true });
  } catch {
    // Directory already exists
  }

  if (url.endsWith(".tar.gz")) {
    await extractTarGz(file, dest);
  } else {
    await Deno.writeFile(dest, file);
  }

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

  // Return the file path
  return dest;
}

async function download(
  url: URL,
  checksum?: string,
): Promise<Uint8Array> {
  console.log(`Downloading ${url}...`);

  const blob = await (await fetch(url)).blob();
  const content = new Uint8Array(await blob.arrayBuffer());

  if (checksum) {
    const sha256sum = await (await fetch(checksum)).text();
    await checkSha256sum(content, sha256sum);
  }

  return content;
}

async function extractTarGz(file: Uint8Array, dest: string) {
  // Decompress the gzip file
  const untar = new Blob([file]).stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new UntarStream());

  // Copy the first binary file found in the tarball
  for await (const entry of untar) {
    const file = (await Deno.create(dest)).writable;
    await entry.readable?.pipeTo(file);
    break;
  }
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
