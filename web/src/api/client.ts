/**
 * API Client Configuration
 * Axios instance for backend communication
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add user ID header
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Get actual user ID from auth context
    const userId = localStorage.getItem('userId') || '8f106a9a-a2f4-45c4-9c92-6b44bc972a9c';
    config.headers['X-User-Id'] = userId;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
