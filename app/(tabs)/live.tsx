import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import * as TaskManager from "expo-task-manager";
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, StyleSheet, View } from "react-native";
import { ethers } from "ethers";
import CONTRACT_ABI from "@/constants/ABI.json";
import { useAuth } from "@/contexts/AuthContext";

const GEOFENCING_TASK_NAME = "GEOFENCING";
const GEOFENCE_ENTER_EVENT = "GEOFENCE_ENTER";
const RPC_URL = "https://sepolia.infura.io/v3/3ca08f13b2f94d4aa806fead92888aa8";
const CONTRACT_ADDRESS = "0xA18fc87e627D90C470cb6C155f5da0964A1370F6";

// On-chain alert sender defined inside component to access signer and location

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
      console.error("Geofencing task error:", error);
      return;
    }

    console.log("Geofencing task triggered:", data);

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
  const { signer, wallet, isAuthenticated } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isGeofencing, setIsGeofencing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);

  const contract = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } catch (e) {
      console.warn("Failed to instantiate contract:", e);
      return null;
    }
  }, [signer]);

  const sendBlockchainAlert = async (message: string) => {
    try {
      if (!isAuthenticated || !signer || !contract) {
        console.warn("Not authenticated or signer unavailable; skipping on-chain alert");
        return false;
      }
      const address: string = wallet ? wallet.address : await signer.getAddress();
      const lat = location?.coords.latitude ?? 0;
      const lon = location?.coords.longitude ?? 0;
      const tx = await contract.Alert(message, address, Math.round(lat), Math.round(lon));
      await tx.wait();
      console.log("Alert tx mined");
      return true;
    } catch (e) {
      console.error("Failed to send blockchain alert:", e);
      return false;
    }
  };

  // Start geofencing when location is available
  useEffect(() => {
    console.log("Location changed:", location?.coords);
    if (location && !isGeofencing) {
      console.log("Starting geofencing setup...");
      startGeofencing();
    }
  }, [location, isGeofencing]); // Added isGeofencing to prevent multiple calls

  // Setup geofencing
  const startGeofencing = async () => {
    try {
      console.log("Requesting foreground permissions...");
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        console.error("Permission denied: Please enable location permissions");
        Alert.alert(
          "Permission Required",
          "Please enable location permissions"
        );
        return;
      }
      console.log("Foreground permission granted");

      console.log("Requesting background permissions...");
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.error(
          "Permission denied: Background location access is required for geofencing"
        );
        Alert.alert(
          "Background Permission Required",
          "Background location access is required for geofencing"
        );
        return;
      }
      console.log("Background permission granted");

      // Check if geofencing is already started
      const isStarted =
        await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME);
      console.log("Is geofencing already started:", isStarted);

      if (isStarted) {
        console.log("Geofencing already active, stopping first...");
        await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
      }

      // Set up geofencing with specified center point and moderate accuracy radius
      const centerLat = 23.1535719 ;
      const centerLon = 72.8864717 ;
      const radius = 1000;

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

      console.log("Geofencing started successfully!");
      setIsGeofencing(true);
    } catch (err) {
      console.error("Failed to start geofencing:", err);
      Alert.alert("Geofencing Error", `Failed to start geofencing: ${err}`);
    }
  };

  // Listen for geofence events - Fixed dependency array
  useEffect(() => {
    console.log("Setting up geofence event listener...");

    const subscription = DeviceEventEmitter.addListener(
      GEOFENCE_ENTER_EVENT,
      (data: { entered: boolean }) => {
        console.log("Geofence event received:", data);
        setIsInsideGeofence(data.entered);
        console.log("Is user inside geofence area:", data.entered);

        if (data.entered) {
          console.log("Showing geofence entry alert");
          sendBlockchainAlert("User entered restricted geofence area");
          DeviceEventEmitter.emit("APP_GEOFENCE_ALERT", {
            title: "Restricted Area",
            message: "You are in the Restricted Area. Do not enter!",
            type: "geofence",
          });
          // Send on-chain alert
        } else {
          console.log("User exited geofence area");
          // Notify and send on-chain alert
          DeviceEventEmitter.emit("APP_GEOFENCE_ALERT", {
            title: "Exit Restricted Area",
            message: "You have exited the restricted area.",
            type: "geofence",
          });
          sendBlockchainAlert("User exited restricted geofence area");
        }
      }
    );

    return () => {
      console.log("Removing geofence event listener");
      subscription.remove();
    };
  }, []); // Fixed: No dependencies needed here

  // Separate effect for periodic alerts - Fixed stale closure issue
  useEffect(() => {
    let alertInterval: ReturnType<typeof setInterval> | null = null;

    if (isInsideGeofence) {
      console.log("Setting up periodic alerts (every 60 seconds)");
      alertInterval = setInterval(() => {
        console.log("Showing periodic alert");
        sendBlockchainAlert("User entered restricted geofence area");
        DeviceEventEmitter.emit("APP_GEOFENCE_ALERT", {
          title: "Restricted Area",
          message: "You are in the Restricted Area. Do not enter!",
          type: "geofence",
        });
      }, 60000); // Show alert every 1 minute
    } else {
      console.log("User not in geofence, no periodic alerts needed");
    }

    return () => {
      if (alertInterval) {
        console.log("Clearing periodic alert interval");
        clearInterval(alertInterval);
      }
    };
  }, [isInsideGeofence]); // Fixed: Proper dependency

  // Location tracking effect - Added better logging
  useEffect(() => {
    async function getCurrentLocation() {
      try {
        console.log("Requesting location permissions...");
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Location permission denied");
          Alert.alert("Permission Required", "Location permission is required");
          return;
        }

        console.log("Getting current location...");
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        console.log("Location obtained:", {
          lat: currentLocation.coords.latitude,
          lon: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
        });

        setLocation(currentLocation);

        // Calculate distance to geofence center for debugging
        const distance = getDistanceInMeters(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          23.153443,
          72.8867434
        );
        console.log(
          `Distance to geofence center: ${distance.toFixed(2)} meters`
        );
      } catch (error) {
        console.error("Error getting location:", error);
      }
    }

    // Get initial location
    console.log("Getting initial location...");
    getCurrentLocation();

    // Set up interval to update location every 15 seconds
    console.log("Setting up location update interval (15 seconds)");
    const locationInterval = setInterval(() => {
      console.log("Updating location...");
      getCurrentLocation();
    }, 15000);

    // Cleanup interval on component unmount
    return () => {
      console.log("Clearing location update interval");
      clearInterval(locationInterval);
    };
  }, []);

  // Get points for circular geofence visualization
  const getCirclePoints = () => {
    const centerLat = 23.153443;
    const centerLon = 72.8867434;
    const radius = 10; // 10 meters radius

    // Create a circle approximation using 32 points
    const points = [];
    const numPoints = 32;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lat = centerLat + (radius / 111320) * Math.cos(angle); // 111320 meters per degree of latitude
      const lon =
        centerLon +
        (radius / (111320 * Math.cos((centerLat * Math.PI) / 180))) *
          Math.sin(angle);
      points.push({ latitude: lat, longitude: lon });
    }
    return points;
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

  // Add debugging info to see current state
  console.log("Current state:", {
    hasLocation: !!location,
    isGeofencing,
    isInsideGeofence,
  });

  return (
    <View style={styles.container}>
      <GoogleMaps.View
        style={styles.map}
        cameraPosition={{
          zoom: 20,
          coordinates: {
            longitude: location?.coords.longitude || 72.8867434,
            latitude: location?.coords.latitude || 23.153443,
          },
        }}
        markers={[
          {
            coordinates: {
              longitude: location?.coords.longitude || 72.8867434,
              latitude: location?.coords.latitude || 23.153443,
            },
          },
        ]}
        polygons={[
          {
            coordinates: getCirclePoints(),
            color: "#ff6a0089", // Red with opacity for visibility
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
