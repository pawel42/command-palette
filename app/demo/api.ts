"use client"

/**
 * A stand-in for whatever the host's commands actually talk to. Slow enough to
 * see the progress bar, and one of them always fails — the failure path is the
 * half that is easy to leave untested.
 *
 * Every call takes a signal, the way `fetch` does. The palette runs one thing
 * at a time and aborts the last one when a new one starts or the user
 * navigates, so work that ignores its signal is work that keeps going after
 * nobody is waiting for it.
 */

/** `setTimeout` that gives up when the signal says so. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }

    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/** Succeeds, and has something to say about it. */
export async function syncRemote(signal?: AbortSignal): Promise<number> {
  await wait(2600, signal)
  return 12
}

/** Fails, with a message worth showing the user. */
export async function deployPreview(signal?: AbortSignal): Promise<never> {
  await wait(2000, signal)
  throw new Error("The preview build failed — check the deploy log")
}

/** What a hand-written page's own form submits to. */
export async function saveTask(
  title: string,
  signal?: AbortSignal
): Promise<string> {
  await wait(900, signal)
  return title || "Untitled"
}
