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

  // Price Matrix APIs
  lookupFixedPrice: async (category, priceLevel, condition, relevance) => {
    const response = await apiClient.get('/price-matrix/lookup', {
      params: {
        category,
        price_level: priceLevel,
        condition,
        relevance
      }
    });
    return response.data;
  },

  getPriceMatrix: async () => {
    const response = await apiClient.get('/price-matrix');
    return response.data;
  },

  downloadPriceMatrix: async () => {
    const response = await axios.get(`${API}/price-matrix/download`, {
      responseType: 'blob'
    });
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'preismatrix.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  uploadPriceMatrix: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API}/price-matrix/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  clearPriceMatrix: async () => {
    const response = await apiClient.delete('/price-matrix');
    return response.data;
  },

  // Auth
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  // Custom categories
  getCustomCategories: async () => {
    const response = await apiClient.get('/custom-categories');
    return response.data;
  },

  addCustomCategory: async (name, image = null) => {
    const response = await apiClient.post('/custom-categories', { name, image });
    return response.data;
  },

  updateCategoryImage: async (name, image) => {
    const response = await apiClient.put(`/custom-categories/${encodeURIComponent(name)}/image`, { image });
    return response.data;
  },

  deleteCustomCategory: async (name) => {
    const response = await apiClient.delete(`/custom-categories/${encodeURIComponent(name)}`);
    return response.data;
  },

  // Export purchases with optional date filter
  exportPurchasesExcel: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await axios.get(`${API}/purchases/export/excel`, {
      responseType: 'blob',
      params
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Include date range in filename if filtered
    let filename = 'ankaufe_export';
    if (startDate || endDate) {
      filename += `_${startDate || 'start'}_bis_${endDate || 'ende'}`;
    }
    filename += '.xlsx';
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Settings
  getSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },

  // Receipt settings
  getReceiptSettings: async () => {
    const response = await apiClient.get('/settings/receipt');
    return response.data;
  },

  updateReceiptSettings: async (receiptSettings) => {
    const response = await apiClient.put('/settings/receipt', receiptSettings);
    return response.data;
  }
};

export default api;
