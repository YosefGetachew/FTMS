import axios from 'axios';

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000/api'
      : '/api'),
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem(
        'ftmsSessionNotice',
        'Your session expired. Please login again to continue.'
      );

      if (window.location.pathname !== '/') {
        window.location.assign('/');
      } else {
        window.location.reload();
      }
    }

    return Promise.reject(error);
  }
);

export default API;
