// Application configuration settings
const config = {
  backendUrl: (process.env.REACT_APP_BACKEND_URL || "https://semantics.inf.um.es/taniwha-ws/"),
  chunkSize: 1024 * 1024,
  debounceDelay: 500,
  pollingInterval: 10000,
};

export default config;
