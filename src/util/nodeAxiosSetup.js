import axios from 'axios';

const nodeAxiosInstance = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
})

nodeAxiosInstance.interceptors.request.use(
    (config) => {
        const nodeToken = localStorage.getItem('jwtNodeToken');
        const sessionToken = localStorage.getItem('jwtToken');
        if (nodeToken)
            config.headers['Authorization'] = `Bearer ${nodeToken}`;
        else if (sessionToken)
            config.headers['Authorization'] = `Bearer ${sessionToken}`;
        return config;
    }, (error) => Promise.reject(error)
)

export const updateNodeAxiosBaseURL = (serviceUrl) => {
    console.log(`Updating Node Axios baseURL to: ${serviceUrl}`);
    nodeAxiosInstance.defaults.baseURL = serviceUrl;
}

export default nodeAxiosInstance;
