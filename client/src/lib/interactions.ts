import { toast } from 'sonner';
import api from './trpc';

/* ────────────────────────────────────────────────────────────────────────────
 * Shared interaction helpers.
 *
 * This file used to export a `showFeatureToast` that answered every click with
 * a green "<Feature> initiated!  Processing your request..." toast and did
 * nothing else. That is where the Roadmap page's permanent "Processing your
 * request..." came from: nothing was ever in flight, so nothing ever finished.
 * Eight such stubs (handleGeneratePRD, handleImportData, handleReclusterThemes,
 * handleAddDataSource, …) were wired to real buttons across six pages.
 *
 * They are gone. A success toast now means a request succeeded, and anything
 * that cannot succeed today says so. What remains:
 *
 *   requestAnalysis()   — the one honest path to /api/analyze, used by every
 *                         feature that genuinely needs Yash's NLP service.
 *   showUnavailable()   — a feature blocked on config or an unmerged service.
 *   showInfoToast()     — genuinely informational; explains, claims nothing.
 *   showErrorToast()    — surfaces a real failure.
 * ──────────────────────────────────────────────────────────────────────── */

export const showErrorToast = (message: string) => {
  toast.error('Error', { description: message });
};

export const showInfoToast = (title: string, message: string) => {
  toast.info(title, { description: message });
};

/**
 * Report a feature that cannot work yet, naming what it is waiting on.
 *
 * Deliberately a warning rather than a success, and it states the blocker, so
 * a click can never read as "it worked" when nothing happened.
 */
export const showUnavailable = (feature: string, blockedOn: string) => {
  toast.warning(`${feature} unavailable`, { description: blockedOn });
};

/** Message shown wherever the AI analysis service is reachable but not real. */
export const AI_UNAVAILABLE_MESSAGE =
  'AI suggestions unavailable — the analysis service is not yet connected.';

export interface AnalysisResult {
  /** True only when a real NLP service answered. */
  live: boolean;
  data: Record<string, unknown> | null;
  /** Present when the call failed outright. */
  error?: string;
}

/**
 * Call POST /api/analyze and report honestly what came back.
 *
 * Three outcomes, and the caller can tell them apart:
 *   { live: true  }            a real service answered
 *   { live: false, error }     the request failed, timed out, or the backend
 *                              returned its `mock: true` fallback
 *
 * The backend answers 200 with `mock: true` when FASTAPI_URL is unset or the
 * service is unreachable, so status alone cannot distinguish real analysis from
 * the placeholder — `mock` has to be read explicitly. Treating a 200 as success
 * is exactly how a mock response ends up displayed as though it were an
 * insight.
 *
 * The abort signal is the other half of the fix. Every AI-dependent button
 * previously had no timeout, so a hung request left the UI spinning forever;
 * the caller here always gets an answer within `timeoutMs`.
 */
export async function requestAnalysis(
  text: string,
  timeoutMs = 8000
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await api.post('/analyze', { text }, { signal: controller.signal });
    const body = response.data ?? {};

    if (body.mock === true) {
      return { live: false, data: body.data ?? null, error: AI_UNAVAILABLE_MESSAGE };
    }

    return { live: true, data: body.data ?? null };
  } catch (err: any) {
    // Axios surfaces an aborted request as ERR_CANCELED / CanceledError.
    const timedOut = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
    const message = timedOut
      ? `Analysis service did not respond within ${Math.round(timeoutMs / 1000)}s.`
      : err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Analysis request failed';

    return { live: false, data: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Trigger a browser download of a text file.
 *
 * Used by the PRD export button, which previously only showed a toast claiming
 * an export had happened.
 */
export function downloadTextFile(filename: string, contents: string, mime = 'text/markdown') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to the clipboard, reporting whether it actually landed.
 *
 * navigator.clipboard is unavailable on insecure origins and can be blocked by
 * permissions policy, so the old unconditional "Copied to clipboard!" toast was
 * a claim the code had not checked.
 */
export async function copyToClipboard(text: string, label = 'Copied to clipboard'): Promise<boolean> {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable in this browser context');
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch (err: any) {
    showErrorToast(err?.message || 'Could not access the clipboard');
    return false;
  }
}
