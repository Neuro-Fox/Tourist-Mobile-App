import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sendLocationToAPI } from './APIService';

const LOCATION_TASK_NAME = 'background-location-task';

export interface LocationData {
  lat: number;
  lon: number;
  ts: string;
  tourist_id: string;
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    console.log('Background location update:', locations);
    
    // Get tourist ID
    const touristId = await getTouristId();
    
    // Process each location update
    for (const location of locations) {
      const locationData: LocationData = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        ts: new Date(location.timestamp).toISOString(),
        tourist_id: touristId,
      };
      
      // Send to AI Backend
      try {
        await sendLocationToAPI(locationData);
      } catch (error) {
        console.error('Failed to send location to API:', error);
      }
    }
  }
});

// Get tourist ID from secure storage
const getTouristId = async (): Promise<string> => {
  try {
    const privateKey = await SecureStore.getItemAsync("user_private_key");
    if (privateKey) {
      // Import ethers to get wallet address from private key
      const { ethers } = await import('ethers');
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    }
    return 'unknown-tourist-id';
  } catch (error) {
    console.error('Error getting tourist ID:', error);
    return 'unknown-tourist-id';
  }
};

export class LocationService {
  private static instance: LocationService;
  private isTracking = false;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission not granted');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.error('Background location permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  public async startBackgroundTracking(): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('Location tracking already started');
        return true;
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return false;
      }

      // Check if the task is already defined
      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        console.error('Background location task not defined');
        return false;
      }

      // Check if the task is already registered
      const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        console.log('Background location task already registered');
        this.isTracking = true;
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10 * 60 * 1000, // 10 minutes in milliseconds
        distanceInterval: 100, // 100 meters
        foregroundService: {
          notificationTitle: 'Tourist Safety Tracking',
          notificationBody: 'Your location is being tracked for safety monitoring',
          notificationColor: '#4CAF50',
        },
        showsBackgroundLocationIndicator: true,
      });

      this.isTracking = true;
      console.log('Background location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  public async stopBackgroundTracking(): Promise<boolean> {
    try {
      if (!this.isTracking) {
        console.log('Location tracking not started');
        return true;
      }

      const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
      console.log('Background location tracking stopped');
      return true;
    } catch (error) {
      console.error('Error stopping background tracking:', error);
      return false;
    }
  }

  public async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  public isLocationTracking(): boolean {
    return this.isTracking;
  }
}

export default LocationService;
