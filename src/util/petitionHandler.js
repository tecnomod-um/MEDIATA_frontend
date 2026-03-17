import axiosInstance from "./axiosSetup";
import nodeAxiosInstance, { updateNodeAxiosBaseURL } from "./nodeAxiosSetup";
// API request handlers for all backend and node petitions

/* System petitions */
// Get backend deployment mode
export const getSystemCapabilities = async () => {
  const response = await axiosInstance.get(`/api/system/capabilities`);
  return response.data;
};

// Fetch the list of projects
export const getProjectList = async () => {
  try {
    const response = await axiosInstance.get(`/api/projects/list`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

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

// Fetch node dataset descriptions
export const getNodeMetadata = async (nodeId) => {
  try {
    const response = await axiosInstance.get(`/nodes/connect/metadata/${nodeId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404)
      return { metadata: null };
    else {
      console.error("Error fetching node metadata:", error);
      if (error.response && error.response.data && error.response.data.error)
        throw new Error(error.response.data.error);
      else
        throw error;
    }
  }
};

// Logs an error to the server
export const logError = (error, info) => {
  axiosInstance.post(`/api/error`, {
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

// Save the schema to the backend.
export const saveSchemaToBackend = async (schema) => {
  try {
    const response = await axiosInstance.post('/nodes/schema', { schema });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch the schema from the backend.
export const fetchSchemaFromBackend = async () => {
  try {
    const response = await axiosInstance.get('/nodes/schema');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Remove the schema from the backend.
export const removeSchemaFromBackend = async () => {
  try {
    const response = await axiosInstance.delete('/nodes/schema');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch ontlology classes
export const fetchClasses = async () => {
  try {
    const response = await axiosInstance.get(`/rdf/class`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching types`,
      error
    );
    throw error;
  }
};

// Fetch autocomplete suggestions for RDF building
export const fetchClassFields = async (type) => {
  try {
    const response = await axiosInstance.get(`/rdf/class/${encodeURIComponent(type)}`);
    console.log("response: ", response)
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching ${type} fields`,
      error
    );
    throw error;
  }
};

// Fetch autocomplete suggestions for RDF building of a specific type
export const fetchSuggestions = async (query, type) => {
  try {
    const endpoint =
      type === "snomed"
        ? `/rdf/snomed`
        : `/rdf/class/suggestions/${type}`;
    const response = await axiosInstance.get(endpoint, {
      params: { query },
    });
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching ${type} suggestions for query: ${query}`,
      error
    );
    throw error;
  }
};

export const uploadSemanticMappingCsv = async (csvText) => {
  try {
    const response = await axiosInstance.post(
      "/rdf/semanticalignment",
      csvText,
      {
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading mapping CSV:", error);
    throw error;
  }
};

// Fetch initial cluster response
export const createInitialClusters = async (jsonText) => {
  try {
    const response = await axiosInstance.post(
      '/fhir/clusters',
      jsonText,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error calling createClusters endpoint:", error);
    throw error;
  }
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
  updateNodeAxiosBaseURL(serviceUrl);

  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/node/validate`,
      { kerberosToken }
    );
    if (response.status === 200) {
      if (response.data.jwtNodeToken === "Unauthorized") {
        localStorage.removeItem("jwtToken");

        // Also remove any token mapping for this serviceUrl
        const tokensMapping = JSON.parse(localStorage.getItem("jwtNodeTokens") || "{}");
        if (tokensMapping[serviceUrl]) {
          delete tokensMapping[serviceUrl];
          localStorage.setItem("jwtNodeTokens", JSON.stringify(tokensMapping));
        }
        throw new Error("Received an Unauthorized jwtNodeToken. JWT has been removed.");
      }
      // Otherwise, store the token as usual
      const tokensMapping = JSON.parse(localStorage.getItem("jwtNodeTokens") || "{}");
      tokensMapping[serviceUrl] = response.data.jwtNodeToken;
      localStorage.setItem("jwtNodeTokens", JSON.stringify(tokensMapping));
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
export const recalculateFeature = async (fileName, featureName, featureType) => {
  // Build URL query parameters
  const params = new URLSearchParams();
  params.append("fileName", fileName);
  params.append("featureName", featureName);
  params.append("featureType", featureType);

  try {
    // Send a POST with a null body; the parameters are appended to the URL.
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/data/reprocessList`,
      null,
      { params }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const filterMultipleFiles = async (payload) => {
  // payload = { multipleFileFilters: [ {fileName, filters}, ... ] }
  try {
    // We send JSON directly, not FormData
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/data/filterByNameList`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // Expect an array of AnalyticsResponseDTO
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

export const setParseConfigs = async (payload) => {
  const response = await nodeAxiosInstance.post(
    `/taniwha/api/harmonization/parse`,
    payload,
    {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    }
  );

  return { status: response.status, data: response.data };
};

export const getParseConfigsStatus = async (jobId) => {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/harmonization/parse/status/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

export const getParseConfigsResult = async (jobId) => {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/harmonization/parse/result/${encodeURIComponent(jobId)}`,
    { validateStatus: () => true }
  );
  return { status: response.status, data: response.data };
};

export const getNodeDatasets = async () => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files/datasets`);
    return response.data;
  } catch (error) {
    console.error("Error occurred while fetching datasets:", error);
    throw error;
  }
};

export const processSelectedDatasets = async (fileNames) => {
  const response = await nodeAxiosInstance.post(
    `/taniwha/api/data/processList`,
    { fileNames }
  );

  // If backend decided it's huge -> 202 with {jobId, progress:true}
  if (response.status === 202 || response.data?.jobId) {
    return { mode: "async", ...response.data };
  }

  // Normal -> 200 with List<AnalyticsResponseDTO>
  return { mode: "sync", results: response.data };
};

export const getProcessSelectedDatasetsStatus = async (jobId) => {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/data/processList/status/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

export async function getProcessSelectedDatasetsResult(jobId) {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/data/processList/result/${jobId}`
  );
  return response.data;
}

export const cancelProcessSelectedDatasetsJob = async (jobId) => {
  const response = await nodeAxiosInstance.post(
    `/taniwha/api/data/processList/cancel/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

export const getNodeMappedDatasets = async () => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files/mapped_datasets`);
    return response.data;
  } catch (error) {
    console.error("Error occurred while fetching datasets:", error);
    throw error;
  }
};

export const getNodeFHIR = async () => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files/fhir_mappings`);
    return response.data;
  } catch (error) {
    console.error("Error occurred while fetching datasets:", error);
    throw error;
  }
};

export const getNodeElements = async () => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files/dataset_elements`);
    return response.data;
  } catch (error) {
    console.error("Error occurred while fetching datasets:", error);
    throw error;
  }
};

export const saveDatasetElements = async (fileName, csvData) => {
  try {
    const response = await nodeAxiosInstance.post(`/taniwha/api/files/save_dataset_elements`, csvData,
      {
        params: { fileName },
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error saving dataset elements:", error);
    throw error;
  }
};

export const fetchElementFile = async (fileName) => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files/dataset_elements/${encodeURIComponent(fileName)}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching element file: ${fileName}`, error);
    throw error;
  }
};

// explorer
export const listExplorerFiles = async (category) => {
  try {
    const response = await nodeAxiosInstance.get(`/taniwha/api/files`, {
      params: { category },
    });
    return response.data;
  } catch (error) {
    console.error("Error listing explorer files:", error);
    throw error;
  }
};

export const renameExplorerFile = async (category, from, to) => {
  try {
    const response = await nodeAxiosInstance.post(
      `/taniwha/api/files/rename`,
      null,
      { params: { category, from, to } }
    );
    return response.data;
  } catch (error) {
    console.error("Error renaming explorer file:", error);
    throw error;
  }
};

export const deleteExplorerFile = async (category, name) => {
  try {
    const response = await nodeAxiosInstance.delete(`/taniwha/api/files`, {
      params: { category, name },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting explorer file:", error);
    throw error;
  }
};

export const cleanExplorerFile = async (category, name, cleaningOptions) => {
  const response = await nodeAxiosInstance.post(
    `/taniwha/api/files/clean`,
    cleaningOptions ?? null,
    { params: { category, name } }
  );
  return response.data;
};

export const startCleanExplorerFile = async (category, name, cleaningOptions) => {
  const response = await nodeAxiosInstance.post(
    `/taniwha/api/files/clean/start`,
    cleaningOptions ?? null,
    {
      params: { category, name },
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    }
  );

  return { status: response.status, data: response.data };
};

export const getCleanExplorerFileStatus = async (jobId) => {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/files/clean/status/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

export const getCleanExplorerFileResult = async (jobId) => {
  const response = await nodeAxiosInstance.get(
    `/taniwha/api/files/clean/result/${encodeURIComponent(jobId)}`,
    { validateStatus: () => true }
  );
  return { status: response.status, data: response.data };
};

export const suggestMappings = async ({ elementFiles, schema }) => {
  const payload = {
    elementFiles,
    schema: schema ? (typeof schema === "string" ? schema : JSON.stringify(schema)) : null,
  };

  const response = await axiosInstance.post("/api/mappings/suggest", payload, {
    headers: { "Content-Type": "application/json" },
  });

  return response.data;
};

export const enrichMappingsStart = async ({ hierarchy, schema }) => {
  const payload = {
    hierarchy,
    schema: schema ? (typeof schema === "string" ? schema : JSON.stringify(schema)) : null,
  };

  const response = await axiosInstance.post("/api/mappings/enrich", payload, {
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  return { status: response.status, data: response.data };
};

export const getEnrichMappingsStatus = async (jobId) => {
  const response = await axiosInstance.get(
    `/api/mappings/enrich/status/${encodeURIComponent(jobId)}`
  );
  return response.data;
};

export const getEnrichMappingsResult = async (jobId) => {
  const response = await axiosInstance.get(
    `/api/mappings/enrich/result/${encodeURIComponent(jobId)}`,
    { validateStatus: () => true }
  );
  return { status: response.status, data: response.data };
};
