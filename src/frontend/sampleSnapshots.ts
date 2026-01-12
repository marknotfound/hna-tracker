const DESKTOP_MAX_POINTS = 28;
const MOBILE_MAX_POINTS = 14;

function sampleToCount<T>(items: T[], targetCount: number): T[] {
  if (items.length <= targetCount) {
    return items;
  }

  const result: T[] = [];

  // Always include first item
  result.push(items[0]);

  // Calculate how many intermediate items we need
  const intermediateCount = targetCount - 2; // exclude first and last

  // Calculate step size for even distribution
  const step = (items.length - 1) / (targetCount - 1);

  for (let i = 1; i <= intermediateCount; i++) {
    const index = Math.round(i * step);
    result.push(items[index]);
  }

  // Always include last item
  result.push(items[items.length - 1]);

  return result;
}

export function sampleSnapshots<T>(snapshots: T[], isMobile: boolean): T[] {
  if (snapshots.length === 0) {
    return snapshots;
  }

  // First, sample to desktop max (28 points)
  const desktopSampled = sampleToCount(snapshots, DESKTOP_MAX_POINTS);

  if (!isMobile) {
    return desktopSampled;
  }

  // For mobile, take every other point from the desktop set
  // This ensures same start and end dates as desktop
  if (desktopSampled.length <= MOBILE_MAX_POINTS) {
    return desktopSampled;
  }

  const mobileSampled: T[] = [];
  for (let i = 0; i < desktopSampled.length; i += 2) {
    mobileSampled.push(desktopSampled[i]);
  }

  // Ensure last item is included (if desktop count is even, last was skipped)
  const lastDesktopItem = desktopSampled[desktopSampled.length - 1];
  if (mobileSampled[mobileSampled.length - 1] !== lastDesktopItem) {
    mobileSampled.push(lastDesktopItem);
  }

  return mobileSampled;
}
