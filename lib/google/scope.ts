/**
 * Google OAuth scope constants and matching. Kept free of any database or
 * network import so it can be unit-tested on its own — lib/db opens a postgres
 * client the moment it is imported.
 */

/** Per-file Drive access: only files the app created or the user picked. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Whether a stored space-separated scope string includes `wanted`. */
export function hasScope(scope: string | null | undefined, wanted: string): boolean {
  return (scope ?? "").split(/\s+/).filter(Boolean).includes(wanted);
}
