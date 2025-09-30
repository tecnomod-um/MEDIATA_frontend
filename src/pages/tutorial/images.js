const importAll = (r) => r.keys().sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true })
).map(r);

export const DiscoverySlides = importAll(
  require.context("../../resources/images/tutorial/slide1", false, /\.jpe?g$/)
);
export const AggregateSlides = importAll(
  require.context("../../resources/images/tutorial/slide2", false, /\.jpe?g$/)
);
export const IntegrationSlides = importAll(
  require.context("../../resources/images/tutorial/slide3", false, /\.jpe?g$/)
);
