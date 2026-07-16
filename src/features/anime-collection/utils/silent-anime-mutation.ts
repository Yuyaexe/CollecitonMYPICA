/** Nestable gate so background anime repairs don't trigger auto-backup downloads. */
let silentDepth = 0;

export function runSilentAnimeMutation<T>(fn: () => T): T {
  silentDepth += 1;
  try {
    return fn();
  } finally {
    silentDepth -= 1;
  }
}

export function isSilentAnimeMutation(): boolean {
  return silentDepth > 0;
}
