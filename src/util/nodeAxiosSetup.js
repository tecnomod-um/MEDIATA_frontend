import axios from "axios";
import config from "../config";

const ROUTING_STORAGE_KEY = "nodeRoutingConfig";
const NODE_PROXY_HEADER = "X-Node-Authorization";

// Axios instance configuration for node-specific API requests
const nodeAxiosInstance = axios.create({
  baseURL: "",
  timeout: 300000,
  headers: {
    "Content-Type": "application/json",
  },
});

const readRoutingConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(ROUTING_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const isProxyBaseURL = (baseURL) => {
  if (typeof baseURL !== "string" || baseURL.trim() === "") return false;

  try {
    const resolved = new URL(baseURL, window.location.origin);
    return resolved.pathname.startsWith("/taniwha-ws/nodes/proxy/")
      || resolved.pathname.startsWith("/taniwha/nodes/proxy/")
      || resolved.pathname.startsWith("/nodes/proxy/");
  } catch {
    return baseURL.includes("/nodes/proxy/");
  }
};

const resolveProxyBaseURL = (proxyBasePath) => {
  if (!proxyBasePath) return null;
  if (/^https?:\/\//i.test(proxyBasePath)) return proxyBasePath;

  const normalizedProxyPath = proxyBasePath.replace(/^\/+/, "");
  return new URL(normalizedProxyPath, config.backendUrl).toString();
};

const isNodeValidationRequest = (value) => {
  const url = value?.config?.url ?? value?.url ?? "";
  return typeof url === "string" && url.includes("/taniwha/node/validate");
};

const isProxiedRequest = (value) => {
  const baseURL = value?.config?.baseURL ?? value?.baseURL ?? "";
  const responseHeaders = value?.headers || value?.response?.headers || {};
  return isProxyBaseURL(baseURL) || responseHeaders["x-node-proxy"] === "true";
};

export const storeNodeRoutingEntry = (serviceUrl, routing = {}) => {
  if (!serviceUrl) return;
  const nextConfig = {
    ...readRoutingConfig(),
    [serviceUrl]: {
      proxyRequired: Boolean(routing.proxyRequired),
      proxyBasePath: routing.proxyBasePath || null,
    },
  };
  localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(nextConfig));
};

export const getResolvedNodeBaseURL = (serviceUrl) => {
  const routing = readRoutingConfig()[serviceUrl];
  if (routing?.proxyRequired && routing?.proxyBasePath) {
    return resolveProxyBaseURL(routing.proxyBasePath);
  }
  return serviceUrl;
};

nodeAxiosInstance.interceptors.request.use(
  (config) => {
    const tokensMapping = JSON.parse(localStorage.getItem("jwtNodeTokens") || "{}");
    const token = tokensMapping[config.baseURL];
    const sessionToken = localStorage.getItem("jwtToken");

    if (isProxyBaseURL(config.baseURL)) {
      if (sessionToken) {
        config.headers["Authorization"] = `Bearer ${sessionToken}`;
      }
      if (token && !isNodeValidationRequest(config)) {
        config.headers[NODE_PROXY_HEADER] = `Bearer ${token}`;
      } else {
        delete config.headers[NODE_PROXY_HEADER];
      }
    } else if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else if (sessionToken) {
      config.headers["Authorization"] = `Bearer ${sessionToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const setupNodeAxiosInterceptors = (logout) => {
  nodeAxiosInstance.interceptors.response.use(
    (response) => {
      if (
        response.data &&
        response.data.jwtNodeToken === "Unauthorized" &&
        !isNodeValidationRequest(response) &&
        !isProxiedRequest(response)
      ) {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("kerberosTGT");
        localStorage.removeItem("jwtNodeTokens");
        logout();
      }
      return response;
    }, (error) => {
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403) &&
        !isNodeValidationRequest(error) &&
        !isProxiedRequest(error)
      ) {
        // Clear all tokens on error status
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("kerberosTGT");
        localStorage.removeItem("jwtNodeTokens");
        logout();
      }
      return Promise.reject(error);
    }
  );
};

export const updateNodeAxiosBaseURL = (serviceUrl) => {
  const resolvedBaseUrl = getResolvedNodeBaseURL(serviceUrl);
  console.log(`Updating Node Axios baseURL to: ${resolvedBaseUrl}`);
  nodeAxiosInstance.defaults.baseURL = resolvedBaseUrl;
};

export default nodeAxiosInstance;
