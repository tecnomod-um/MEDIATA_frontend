// Axios instance configuration for node-specific API requests
import axios from "axios";

const nodeAxiosInstance = axios.create({
  baseURL: "",
  timeout: 300000,
  headers: {
    "Content-Type": "application/json",
  },
});

nodeAxiosInstance.interceptors.request.use(
  (config) => {
    const tokensMapping = JSON.parse(localStorage.getItem("jwtNodeTokens") || "{}");
    const token = tokensMapping[config.baseURL];
    const sessionToken = localStorage.getItem("jwtToken");

    if (token)
      config.headers["Authorization"] = `Bearer ${token}`;
    else if (sessionToken)
      config.headers["Authorization"] = `Bearer ${sessionToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const setupNodeAxiosInterceptors = (logout) => {
  nodeAxiosInstance.interceptors.response.use(
    (response) => {
      if (response.data && response.data.jwtNodeToken === "Unauthorized") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("kerberosTGT");
        localStorage.removeItem("jwtNodeTokens");
        logout();
      }
      return response;
    }, (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
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
  console.log(`Updating Node Axios baseURL to: ${serviceUrl}`);
  nodeAxiosInstance.defaults.baseURL = serviceUrl;
};

export default nodeAxiosInstance;
