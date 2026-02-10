import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rewear_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token) — force re-login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
      localStorage.removeItem('rewear_user');
      localStorage.removeItem('rewear_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

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

  // Delete all purchases
  resetHistory: async () => {
    const response = await apiClient.delete('/purchases');
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
    const response = await apiClient.get('/price-matrix/download', {
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
    const response = await apiClient.post('/price-matrix/upload', formData, {
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

  addCustomCategory: async (name, image = null, icon = null) => {
    const response = await apiClient.post('/custom-categories', { name, image, icon });
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

    const response = await apiClient.get('/purchases/export/excel', {
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
  },

  // ============== Customer APIs ==============

  // Get all customers (with optional search)
  getCustomers: async (search = '') => {
    const params = search ? { search } : {};
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },

  // Create a new customer
  createCustomer: async (customerData) => {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
  },

  // Get single customer with transactions
  getCustomer: async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    const response = await apiClient.put(`/customers/${id}`, customerData);
    return response.data;
  },

  // Delete customer
  deleteCustomer: async (id) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },

  // Create transaction (manual credit/debit)
  createTransaction: async (customerId, transactionData, staffUsername = 'system') => {
    const response = await apiClient.post(
      `/customers/${customerId}/transactions?staff_username=${encodeURIComponent(staffUsername)}`,
      transactionData
    );
    return response.data;
  },

  // Export customers to Excel
  exportCustomersExcel: async () => {
    const response = await apiClient.get('/customers/export/excel', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kunden_guthaben_export.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Create purchase with credit option
  createPurchaseWithCredit: async (items, creditCustomerId = null, staffUsername = null) => {
    const response = await apiClient.post('/purchases', {
      items,
      credit_customer_id: creditCustomerId,
      staff_username: staffUsername
    });
    return response.data;
  }
};

export default api;
