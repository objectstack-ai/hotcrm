// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { PROTOCOL_VERSION } from '@objectstack/spec/kernel';

/**
 * How the version guards read an `@objectstack/*` pin that is a `next`
 * snapshot rather than a release.
 *
 * The platform publishes a snapshot of `main` under the `next` dist-tag as
 * `0.0.0-next-<UTC yyyymmddhhmmss>` (objectstack ADR-0125, amendment of
 * 2026-11-05: `changeset version --snapshot next`, workspace only). An app
 * pins one to try a fix before the release that carries it. The `0.0.0` is the
 * snapshot naming scheme, not a platform major: the snapshot is cut from the
 * current line, and its handshake constant `PROTOCOL_VERSION` (which the
 * snapshot lane does not touch) still names that line's major.
 *
 * Measured 2026-11-15 on `0.0.0-next-20261115100430` (objectstack bd96ec9c):
 * every runtime suite passed, and four guards failed only because they read
 * major `0` out of the pin, or asked the docs to name a version no release
 * notes describe.
 */
export const NEXT_SNAPSHOT = /^0\.0\.0-next-\d{14}$/;

/** True for a `next` snapshot version or range (`0.0.0-next-20261115100430`, `^0.0.0-next-…`). */
export const isNextSnapshot = (version: string | undefined): boolean =>
  NEXT_SNAPSHOT.test((version ?? '').replace(/^[\^~>=<\s]+/, ''));

/** The major of the line the installed `@objectstack/spec` belongs to, read from its handshake constant. */
export const PROTOCOL_MAJOR: number = Number.parseInt(String(PROTOCOL_VERSION).split('.')[0] ?? '', 10);

/**
 * The platform major a version or range belongs to: the leading number of a
 * release, and the installed spec's protocol major for a `next` snapshot.
 * NaN when neither reads.
 */
export const platformMajorOf = (version: string | undefined): number => {
  if (isNextSnapshot(version)) return PROTOCOL_MAJOR;
  const m = /(\d+)\./.exec(String(version ?? ''));
  return m ? Number(m[1]) : Number.NaN;
};

/** A release version (`18.4.0`, `18.4.0-rc.1`), not a snapshot. */
export const isReleaseVersion = (version: string): boolean =>
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) && !isNextSnapshot(version);
