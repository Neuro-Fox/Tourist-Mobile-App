// API Configuration
export const API_CONFIG = {
  // Update this URL to match your AI Backend deployment
  AI_BACKEND_URL: 'http://localhost:8000',
  
  // Alternative URLs for different environments
  // AI_BACKEND_URL: 'https://your-ai-backend.herokuapp.com', // Production
  // AI_BACKEND_URL: 'http://192.168.1.100:8000', // Local network
  // AI_BACKEND_URL: 'https://your-domain.com/api', // Custom domain
  
  // API Endpoints
  ENDPOINTS: {
    INGEST: '/ingest',
    ALERTS: '/alerts',
  },
  
  // Request configuration
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
};

export default API_CONFIG;
