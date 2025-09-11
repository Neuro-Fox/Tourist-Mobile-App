import { LocationData } from './LocationService';
import { API_CONFIG } from '../config/api';

const AI_BACKEND_URL = "http://12.10.1.127:8000";

export interface APIResponse {
  tourist_id: string;
  timestamp: string;
  current_location: {
    lat: number;
    lon: number;
  };
  anomalies_detected: any[];
  risk_probability: number | null;
  safety_score: number | null;
  next_expected_location: {
    lat: number;
    lon: number;
  } | null;
  next_expected_time: string;
  alert: boolean;
}

export class APIService {
  private static instance: APIService;

  private constructor() {}

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  public async sendLocationToAPI(locationData: LocationData): Promise<APIResponse | null> {
    try {
      console.log('Sending location data to AI Backend:', locationData);

      const response = await fetch(`${AI_BACKEND_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse = await response.json();
      console.log('AI Backend response:', result);

      // Handle alerts if any
      if (result.alert) {
        console.warn('Safety alert detected:', result.anomalies_detected);
        // You can add notification logic here
        this.handleSafetyAlert(result);
      }

      return result;
    } catch (error) {
      console.error('Error sending location to API:', error);
      return null;
    }
  }

  public async getAlerts(onlyAlerts: boolean = false): Promise<any[]> {
    try {
      const response = await fetch(`${AI_BACKEND_URL}/alerts?only_alerts=${onlyAlerts}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const alerts = await response.json();
      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  private handleSafetyAlert(alertData: APIResponse): void {
    // This method can be expanded to show notifications, play sounds, etc.
    console.warn('SAFETY ALERT:', {
      tourist_id: alertData.tourist_id,
      anomalies: alertData.anomalies_detected,
      risk_probability: alertData.risk_probability,
      safety_score: alertData.safety_score,
    });
  }
}

// Export convenience function
export const sendLocationToAPI = (locationData: LocationData): Promise<APIResponse | null> => {
  return APIService.getInstance().sendLocationToAPI(locationData);
};

export default APIService;
