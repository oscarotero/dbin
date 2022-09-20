<!-- deno-fmt-ignore-file -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.2.0] - Unreleased
### Added
- Support for raw binary files (without .tar.gz compression).
- New option `checksumPattern` to configure the checksum file.

### Changed
- The `arch` property of the targets is optional.

## [0.1.1] - 2022-09-18
### Added
- Show in the console if the file already exist.
- New options `os` and `arch` to force specific values.

### Fixed
- Improved types and docs.

## [0.1.0] - 2022-09-17
First version

[0.2.0]: https://github.com/oscarotero/dbin/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/oscarotero/dbin/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/oscarotero/dbin/releases/tag/v0.1.0
