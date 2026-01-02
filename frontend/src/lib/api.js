import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const api = {
  // Get categories config
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  // Create a new purchase
  createPurchase: async (items) => {
    const response = await apiClient.post('/purchases', { items });
    return response.data;
  },

  // Get all purchases with optional date filter
  getPurchases: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get('/purchases', { params });
    return response.data;
  },

  // Get single purchase
  getPurchase: async (id) => {
    const response = await apiClient.get(`/purchases/${id}`);
    return response.data;
  },

  // Delete purchase
  deletePurchase: async (id) => {
    const response = await apiClient.delete(`/purchases/${id}`);
    return response.data;
  },

  // Get daily stats
  getDailyStats: async (days = 30) => {
    const response = await apiClient.get('/stats/daily', { params: { days } });
    return response.data;
  },

  // Get monthly stats
  getMonthlyStats: async (months = 12) => {
    const response = await apiClient.get('/stats/monthly', { params: { months } });
    return response.data;
  },

  // Get today's summary
  getTodayStats: async () => {
    const response = await apiClient.get('/stats/today');
    return response.data;
  },
};

export default api;
