import axios from "axios";
import config from "../config";

const axiosInstance = axios.create({
  baseURL: config.backendUrl,
  timeout: 300000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwtToken");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;

    if (
      config.url.includes("/nodes/connect/info") ||
      config.url.includes("/node/validate")
    ) {
      const tgt = localStorage.getItem("kerberosTGT");
      if (tgt) config.headers["Kerberos-TGT"] = tgt;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Function to set up response interceptor
export const setupAxiosInterceptors = (logout) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      )
        logout();
      return Promise.reject(error);
    }
  );
};

export default axiosInstance;