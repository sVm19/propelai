// client/utils/api.js

// Use the environment variable from your .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001';

export const publicApi = {
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
  generateIdea: async (prompt) => {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Generation failed');
    return await response.json();
  },
  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/api/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json();
  },
};