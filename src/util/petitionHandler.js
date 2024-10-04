import axiosInstance from "./axiosSetup";
import nodeAxiosInstance, { updateNodeAxiosBaseURL } from "./nodeAxiosSetup";

/* System petitions */

// Fetch the list of nodes
export const getNodeList = async () => {
  try {
    const response = await axiosInstance.get(`/nodes/connect/list`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch node connection data along with the token
export const getNodeInfo = async (nodeId) => {
  try {
    const response = await axiosInstance.get(`/nodes/connect/info/${nodeId}`);
    return response.data;
  } catch (error) {
    console.log(error);
    if (error.response && error.response.data && error.response.data.error)
      throw new Error(error.response.data.error);
    else throw error;
  }
};

// Logs an error to the server
export const logError = (error, info) => {
  axiosInstance
    .post(`/api/error`, {
      error: error.toString(),
      info,
      timestamp: new Date().toISOString(),
    })
    .then((response) => {
      if (response.status === 200)
        console.log("Error logged to server successfully.");
      else
        console.error(
          "Failed to log error to server. Unexpected response status:",
          response.status
        );
    })
    .catch((err) => console.error("Error logging to server:", err));
};

// User login
export const loginUser = async (username, password) => {
  try {
    const response = await axiosInstance.post(
      `/api/user/login`,
      {
        username,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 200) {
      localStorage.setItem("jwtToken", response.data.token);
      localStorage.setItem("kerberosTGT", response.data.tgt);
      return response.data;
    } else throw new Error("Login failed");
  } catch (error) {
    throw error;
  }
};

/* Data driven petitions */

// Node verification
export const nodeAuth = async (serviceUrl, kerberosToken) => {
  console.log(`Authenticating node with serviceUrl: ${serviceUrl}`);
  localStorage.removeItem("jwtNodeToken");
  updateNodeAxiosBaseURL(serviceUrl);

  try {
    const response = await nodeAxiosInstance.post(`/taniwha/node/validate`, {
      kerberosToken,
    });
    if (response.status === 200) {
      localStorage.setItem("jwtNodeToken", response.data.jwtNodeToken);
      return response.data;
    } else {
      throw new Error("Node auth failed");
    }
  } catch (error) {
    throw error;
  }
};

// Uploads a csv or other file to check its data
export const uploadFile = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/data/process`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Recalcs a feature of the current shown data file
export const recalculateFeature = async (file, featureName, featureType) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("featureName", featureName);
  formData.append("featureType", featureType);

  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/data/reprocess`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Changes which rows of the current file are taken into account and shown
export const filterData = async (file, filters) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filters", JSON.stringify(filters));

  console.log(JSON.stringify(filters));
  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/data/filter`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Makes the node save a mock file for the federated model to consume
export const saveMockFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/harmonization/mock`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
