export const FREEDOM_CHART_ID = "freedom-projection-chart";

/** Keep the projection card just below the sticky public header. */
export function stickyHeaderScrollMargin(headerHeight: number): string {
  return `${Math.max(0, Math.ceil(headerHeight))}px`;
}

export function scrollToFreedomChart() {
  const chart = document.getElementById(FREEDOM_CHART_ID);
  if (!(chart instanceof HTMLElement)) return;
  const header = document.querySelector(".public-header");
  const headerHeight =
    header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
  chart.style.scrollMarginTop = stickyHeaderScrollMargin(headerHeight);
  chart.scrollIntoView({ behavior: "smooth", block: "start" });
  chart.focus({ preventScroll: true });
}
