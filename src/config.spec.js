import config from './config';

describe('config', () => {
  it('exports a config object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('has backendUrl property', () => {
    expect(config).toHaveProperty('backendUrl');
    expect(typeof config.backendUrl).toBe('string');
  });

  it('has chunkSize property', () => {
    expect(config).toHaveProperty('chunkSize');
    expect(typeof config.chunkSize).toBe('number');
    expect(config.chunkSize).toBeGreaterThan(0);
  });

  it('has debounceDelay property', () => {
    expect(config).toHaveProperty('debounceDelay');
    expect(typeof config.debounceDelay).toBe('number');
    expect(config.debounceDelay).toBeGreaterThan(0);
  });

  it('has pollingInterval property', () => {
    expect(config).toHaveProperty('pollingInterval');
    expect(typeof config.pollingInterval).toBe('number');
    expect(config.pollingInterval).toBeGreaterThan(0);
  });

  it('chunkSize is 1MB', () => {
    expect(config.chunkSize).toBe(1024 * 1024);
  });

  it('debounceDelay is reasonable (in milliseconds)', () => {
    expect(config.debounceDelay).toBe(500);
  });

  it('pollingInterval is reasonable (in milliseconds)', () => {
    expect(config.pollingInterval).toBe(10000);
  });
});
