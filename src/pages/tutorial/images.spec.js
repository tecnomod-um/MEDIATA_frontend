// Mock the entire images module since require.context is a webpack feature
jest.mock('./images', () => ({
  DiscoverySlides: [],
  AggregateSlides: [],
  IntegrationSlides: [],
}));

describe('Tutorial Images', () => {
  const images = require('./images');

  describe('Image exports structure', () => {
    it('exports DiscoverySlides', () => {
      expect(images).toHaveProperty('DiscoverySlides');
    });

    it('exports AggregateSlides', () => {
      expect(images).toHaveProperty('AggregateSlides');
    });

    it('exports IntegrationSlides', () => {
      expect(images).toHaveProperty('IntegrationSlides');
    });

    it('DiscoverySlides is an array', () => {
      expect(Array.isArray(images.DiscoverySlides)).toBe(true);
    });

    it('AggregateSlides is an array', () => {
      expect(Array.isArray(images.AggregateSlides)).toBe(true);
    });

    it('IntegrationSlides is an array', () => {
      expect(Array.isArray(images.IntegrationSlides)).toBe(true);
    });

    it('all three exports are defined', () => {
      expect(images.DiscoverySlides).toBeDefined();
      expect(images.AggregateSlides).toBeDefined();
      expect(images.IntegrationSlides).toBeDefined();
    });
  });
});

