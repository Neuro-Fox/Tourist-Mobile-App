import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import * as TaskManager from "expo-task-manager";
import { useEffect, useState } from "react";
import { DeviceEventEmitter, StyleSheet, View } from "react-native";
import CustomGeofenceAlert from "../../components/CustomGeofenceAlert";

const GEOFENCING_TASK_NAME = "GEOFENCING";
const GEOFENCE_ENTER_EVENT = "GEOFENCE_ENTER";

// Define the task that will handle geofencing events
TaskManager.defineTask(
  GEOFENCING_TASK_NAME,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{
    eventType: Location.GeofencingEventType;
    region: { identifier: string };
  }>) => {
    if (error) {
      console.error(error);
      return;
    }
    if (data.eventType === Location.GeofencingEventType.Enter) {
      console.log("Geofence Enter Event Triggered");
      DeviceEventEmitter.emit(GEOFENCE_ENTER_EVENT, { entered: true });
    } else if (data.eventType === Location.GeofencingEventType.Exit) {
      console.log("Geofence Exit Event Triggered");
      DeviceEventEmitter.emit(GEOFENCE_ENTER_EVENT, { entered: false });
    }
  }
);

export default function Live() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isGeofencing, setIsGeofencing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);

  // Start geofencing when location is available
  useEffect(() => {
    if (location) {
      startGeofencing();
    }
  }, [location]);

  // Setup geofencing
  const startGeofencing = async () => {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        console.error("Permission denied: Please enable location permissions");
        return;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.error(
          "Permission denied: Background location access is required for geofencing"
        );
        return;
      }

      // Check if geofencing is already started
      const isStarted =
        await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME);
      if (isStarted) {
        return;
      }

      // Start geofencing with center point and radius to approximate the square area
      const centerLat = (23.1534683 + 23.1535993) / 2;
      const centerLon = (72.8864581 + 72.8865352) / 2;

      // Calculate radius to cover the square (approximately)
      const radius = Math.max(
        getDistanceInMeters(23.1534683, 72.8864581, 23.1535993, 72.8865352) / 2
      );

      console.log("Starting geofence with center:", {
        centerLat,
        centerLon,
        radius,
      });
      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, [
        {
          latitude: centerLat,
          longitude: centerLon,
          radius: radius,
          identifier: "square-geofence",
        },
      ]);

      setIsGeofencing(true);
    } catch (err) {
      console.error("Failed to start geofencing", err);
    }
  };

  // Listen for geofence entered event and handle periodic alerts
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      GEOFENCE_ENTER_EVENT,
      (data: { entered: boolean }) => {
        console.log("Geofence event received:", data);
        setIsInsideGeofence(data.entered);
        if (data.entered) {
          console.log("Setting alert visible");
          setAlertVisible(true);
        }
      }
    );

    // Set up periodic alerts when inside geofence
    let alertInterval: number | null = null;
    if (isInsideGeofence) {
      alertInterval = setInterval(() => {
        setAlertVisible(true);
      }, 60000) as unknown as number; // Show alert every 1 minute
    }

    return () => {
      subscription.remove();
      if (alertInterval) {
        clearInterval(alertInterval);
      }
    };
  }, [isInsideGeofence]);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    // Get initial location
    getCurrentLocation();

    // Set up interval to update location every 15 seconds
    const locationInterval = setInterval(() => {
      getCurrentLocation();
    }, 15000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(locationInterval);
    };
  }, []);

  // Get points for the square geofence
  const getSquarePoints = () => {
    return [
      { latitude: 23.1534683, longitude: 72.8864581 },
      { latitude: 23.1534745, longitude: 72.8865305 },
      { latitude: 23.153599, longitude: 72.8865352 },
      { latitude: 23.1535993, longitude: 72.886451 },
      { latitude: 23.1534683, longitude: 72.8864581 }, // Close the polygon
    ];
  };

  // Calculate distance between two points in meters
  const getDistanceInMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <View style={styles.container}>
      <GoogleMaps.View
        style={styles.map}
        cameraPosition={{
          zoom: 20,
          coordinates: {
            longitude: location?.coords.longitude,
            latitude: location?.coords.latitude,
          },
        }}
        markers={[
          {
            coordinates: {
              longitude: location?.coords.longitude,
              latitude: location?.coords.latitude,
            },
          },
        ]}
        polygons={[
          {
            coordinates: getSquarePoints(),
            color: "#ff6a0089", // Red with default opacity
          },
        ]}
      />
      <CustomGeofenceAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        locationName="Tourist Spot"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  paragraph: {
    fontSize: 18,
    textAlign: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
