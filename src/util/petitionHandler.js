import axios from "axios";
import config from '../config';

export const logError = (error, info) => {
    axios.post(`${config.backendUrl}/api/error`, {
        error: error.toString(),
        info,
        timestamp: new Date().toISOString(),
    })
        .then(response => {
            if (response.status === 200)
                console.log('Error logged to server successfully.');
            else
                console.error('Failed to log error to server. Unexpected response status:', response.status);
        })
        .catch(err => console.error('Error logging to server:', err));
}

export const uploadFile = async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${config.backendUrl}/api/data/process`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const recalculateFeature = async (file, featureName, featureType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('featureName', featureName);
    formData.append('featureType', featureType);

    try {
        const response = await axios.post(`${config.backendUrl}/api/data/reprocess`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}
