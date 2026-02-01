import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (email: string, name: string, password: string) =>
    api.post('/auth/signup', { email, name, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const postsAPI = {
  getAll: () => api.get('/posts'),
  create: (title: string, content: string) =>
    api.post('/posts', { title, content }),
  getUserPosts: (userId: number) => api.get(`/posts/user/${userId}`),
};

export const simulateAPI = {
  run: (circuit: any) => api.post('/simulate', circuit),
};

export default api;
