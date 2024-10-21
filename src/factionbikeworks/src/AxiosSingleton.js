// AxiosSingleton.js
import axios from 'axios';
import CookieManager from './CookieManager';

class AxiosSingleton {
  static instance = null;

  constructor() {
    if (!AxiosSingleton.instance) {
      AxiosSingleton.instance = axios.create({
        baseURL: process.env.REACT_APP_BACKEND_HOST, // Your backend URL
        withCredentials: true, // Important for sending cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Add a request interceptor to attach cookies
      AxiosSingleton.instance.interceptors.request.use(config => {
        const sessionId = CookieManager.getCookie('sessionId');
        if (sessionId) {
          config.headers['Authorization'] = `Bearer ${sessionId}`; // or whatever auth scheme you're using
        }
        return config;
      }, error => {
        return Promise.reject(error);
      });
    }
  }

  getInstance() {
    return AxiosSingleton.instance;
  }
}

// Export the singleton instance
const axiosInstance = new AxiosSingleton();
export default axiosInstance.getInstance();
