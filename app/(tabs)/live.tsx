import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import * as TaskManager from "expo-task-manager";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

const GEOFENCING_TASK_NAME = "GEOFENCING";

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
      Alert.alert("Welcome!", "You've entered the geofenced area!");
    } else if (data.eventType === Location.GeofencingEventType.Exit) {
      Alert.alert("Goodbye!", "You've left the geofenced area!");
    }
  }
);

export default function Live() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isGeofencing, setIsGeofencing] = useState(false);

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
        Alert.alert("Permission denied", "Please enable location permissions");
        return;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        Alert.alert(
          "Permission denied",
          "Background location access is required for geofencing"
        );
        return;
      }

      // Check if geofencing is already started
      const isStarted = await Location.hasStartedGeofencingAsync(
        GEOFENCING_TASK_NAME
      );
      if (isStarted) {
        return;
      }

      // Start geofencing
      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, [
        {
          latitude: location!.coords.latitude,
          longitude: location!.coords.longitude,
          radius: 5,
        },
      ]);

      setIsGeofencing(true);
    } catch (err) {
      console.error("Failed to start geofencing", err);
      Alert.alert("Error", "Failed to start geofencing");
    }
  };

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  // Calculate points for a 100m circle around current location
  const getCirclePoints = (lat: number, lon: number) => {
    // 0.0009 degrees is approximately 100 meters
    const radius = 0.0009;
    const points = [];
    // Generate 32 points around the circle for smooth appearance
    for (let i = 0; i <= 32; i++) {
      const angle = (i * 2 * Math.PI) / 32;
      points.push({
        latitude: lat + radius * Math.cos(angle),
        longitude: lon + radius * Math.sin(angle),
      });
    }
    return points;
  };

  return (
    <View style={styles.container}>
      <GoogleMaps.View
        style={styles.map}
        cameraPosition={{
          zoom: 17,
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
            coordinates: location
              ? getCirclePoints(
                  location.coords.latitude,
                  location.coords.longitude
                )
              : [],
            color: "red", // Red with default opacity
          },
        ]}
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
