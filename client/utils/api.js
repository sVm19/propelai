// client/utils/api.js

// Use the environment variable from your .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const publicApi = {
  // Generic POST method
  post: async (endpoint, body) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown Error' }));
      // Throw an error object that matches what the UI expects (err.response.data.detail)
      const error = new Error('API Request Failed');
      error.response = { data: errorData };
      throw error;
    }

    return { data: await response.json() };
  },

  getGreeting: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/greeting`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  generateIdea: async (prompt, tone) => {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, tone }),
    });
    if (!response.ok) throw new Error('Generation failed');
    return await response.json();
  },

  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/api/history`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json();
  },

  deleteIdea: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/ideas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete idea');
    return await response.json();
  },

  toggleStar: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/ideas/${id}/toggle-star`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle star');
    return await response.json();
  }
};