import '@testing-library/jest-dom';

jest.mock('axios', () => {
  const mockReqUse = jest.fn();
  const mockResUse = jest.fn();

  const mockAxios = {
    interceptors: {
      request: { use: mockReqUse },
      response: { use: mockResUse },
    },
  };

  const mockCreate = jest.fn(() => mockAxios);
  const def = { create: mockCreate };
  def.__m = { mockReqUse, mockResUse, mockCreate, mockAxios };
  return { __esModule: true, default: def };
});

jest.mock('../config', () => ({ backendUrl: 'https://api.example.com' }));

let axiosInstance;
let setupAxiosInterceptors;
let mockResUse;
let mockAxios;

beforeAll(() => {
  const axios = require('axios').default;
  ({ mockResUse, mockAxios } = axios.__m);

  jest.isolateModules(() => {
    const mod = require('../util/axiosSetup.js');
    axiosInstance = mod.default;
    setupAxiosInterceptors = mod.setupAxiosInterceptors;
  });
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('axiosSetup utility', () => {
  it('creates axios instance with expected defaults', () => {
    expect(axiosInstance).toBe(mockAxios);
  });

  describe('response interceptor', () => {
    let errHandler;
    let logoutSpy;

    beforeEach(() => {
      logoutSpy = jest.fn();
      setupAxiosInterceptors(logoutSpy);
      errHandler = mockResUse.mock.calls.at(-1)[1];
    });

    it.each([401, 403])('invokes logout on HTTP %p', async (status) => {
      const err = { response: { status } };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('ignores non-auth errors', async () => {
      const err = { response: { status: 500 } };
      await expect(errHandler(err)).rejects.toBe(err);
      expect(logoutSpy).not.toHaveBeenCalled();
    });
  });
});