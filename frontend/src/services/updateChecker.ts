export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseName?: string;
  tagName: string;
}

const CURRENT_APP_VERSION = '1.0.0';
const GITHUB_REPO = 'asakue/Sonora';
const SEEN_UPDATE_KEY = 'sonora_seen_update_release';

/**
 * Compares two semantic version strings (e.g., '1.0.0' vs '1.0.1').
 * Returns 1 if vA > vB, -1 if vA < vB, 0 if equal.
 */
function compareSemver(vA: string, vB: string): number {
  const cleanA = vA.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
  const cleanB = vB.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);

  const len = Math.max(cleanA.length, cleanB.length);
  for (let i = 0; i < len; i++) {
    const a = cleanA[i] || 0;
    const b = cleanB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Checks GitHub Releases API for a newer version.
 * If a newer version exists and has not yet been dismissed by the user, returns UpdateInfo.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const release = await res.json();
    const tagName: string = release.tag_name || '';
    if (!tagName) return null;

    const latestClean = tagName.replace(/^v/i, '');
    const isNewer = compareSemver(latestClean, CURRENT_APP_VERSION) > 0;

    if (!isNewer) {
      return null;
    }

    // Check if user has already dismissed this specific release
    const seenRelease = localStorage.getItem(SEEN_UPDATE_KEY);
    if (seenRelease === tagName) {
      return null;
    }

    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: tagName.startsWith('v') ? tagName : `v${tagName}`,
      releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      releaseName: release.name || tagName,
      tagName: tagName,
    };
  } catch (err) {
    console.warn('Update check failed (offline or network error):', err);
    return null;
  }
}

/**
 * Marks a release version as seen/dismissed so the notification never appears again for this version.
 */
export function markUpdateDismissed(tagName: string): void {
  try {
    localStorage.setItem(SEEN_UPDATE_KEY, tagName);
  } catch {}
}
