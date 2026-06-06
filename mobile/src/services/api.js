import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

const API = axios.create({
  baseURL,
  timeout: 20000,
});

export const apiOrigin = baseURL.replace(/\/api\/?$/, '');

export default API;
