import { useColorScheme } from "@/hooks/useColorScheme";
import { getPlaceInfo } from "@/utils/locationUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LocationTracker from "@/components/LocationTracker";

export default function TouristSafetyApp() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [placeInfo, setPlaceInfo] = useState<{
    name: string;
    photoUrl: string | null;
  } | null>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  // Emergency button state will be handled by parent component in the future
  const [isPressed, setIsPressed] = useState(false);
  const themes = {
    light: {
      background: "#FFFFFF",
      headerBackground: "#F8F9FA",
      text: "#212529",
      subText: "#6C757D",
      cardBackground: "#FFFFFF",
      border: "#E9ECEF",
      statusBar: "dark-content",
    },
    dark: {
      background: "#1A1B23",
      headerBackground: "#2D2E36",
      text: "#FFFFFF",
      subText: "#B8BCC8",
      cardBackground: "#2D2E36",
      border: "#404040",
      statusBar: "light-content",
    },
  };

  const currentTheme = isDarkMode ? themes.dark : themes.light;

  const safetyScore = 87;
  const currentLocation = "New York, NY";
  const coordinates = "40.712800, -74.006000";

  interface Theme {
    background: string;
    headerBackground: string;
    text: string;
    subText: string;
    cardBackground: string;
    border: string;
    statusBar: "default" | "light-content" | "dark-content";
  }

  interface Themes {
    light: Theme;
    dark: Theme;
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#00D4AA";
    if (score >= 60) return "#FFA500";
    return "#FF4757";
  };

  interface ScoreTextProps {
    score: number;
  }

  const getScoreText = (score: number): string => {
    if (score >= 80) return "Excellent safety rating";
    if (score >= 60) return "Good safety rating";
    return "Poor safety rating";
  };

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      if (location?.coords) {
        try {
          const info = await getPlaceInfo(
            location.coords.latitude,
            location.coords.longitude
          );
          setPlaceInfo(info);
        } catch (error) {
          console.error("Error fetching place info:", error);
        }
      }
    }

    getCurrentLocation();
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <StatusBar
        barStyle={
          currentTheme.statusBar as "default" | "light-content" | "dark-content"
        }
        backgroundColor={currentTheme.background}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View
          style={[
            styles.header,
            { backgroundColor: currentTheme.headerBackground },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: currentTheme.text }]}>
                Hello, Tourist!
              </Text>
              <Text style={[styles.subtitle, { color: currentTheme.subText }]}>
                Stay safe during your travels
              </Text>
            </View>
            <View style={styles.themeToggle}>
              <TouchableOpacity
                style={styles.profileButton}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={currentTheme.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Safety Score Section */}
          <View style={styles.safetyScoreContainer}>
            <View style={styles.scoreHeader}>
              <Text style={[styles.scoreTitle, { color: currentTheme.text }]}>
                Safety Score
              </Text>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={getScoreColor(safetyScore)}
              />
            </View>

            <Text
              style={[
                styles.scoreNumber,
                { color: getScoreColor(safetyScore) },
              ]}
            >
              {safetyScore}
            </Text>

            <Text
              style={[styles.scoreDescription, { color: currentTheme.subText }]}
            >
              {getScoreText(safetyScore)}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: currentTheme.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${safetyScore}%`,
                      backgroundColor: getScoreColor(safetyScore),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View
          style={[
            styles.locationCard,
            {
              backgroundColor: currentTheme.cardBackground,
              borderColor: currentTheme.border,
            },
          ]}
        >
          {placeInfo?.photoUrl && (
            <Image
              source={{ uri: placeInfo.photoUrl }}
              style={styles.locationImage}
            />
          )}
          <View style={styles.compassOverlay}>
            <Ionicons name="navigate" size={24} color="#FFC107" />
          </View>

          <View style={styles.locationInfo}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={16} color="#007BFF" />
              <Text
                style={[styles.locationLabel, { color: currentTheme.subText }]}
              >
                Current Location
              </Text>
            </View>
            <Text style={[styles.locationName, { color: currentTheme.text }]}>
              {placeInfo?.name || "Loading location..."}
            </Text>
            <Text style={[styles.coordinates, { color: currentTheme.subText }]}>
              {location
                ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
                : "Getting coordinates..."}
            </Text>
          </View>
        </View>

        {/* Location Tracking Section */}
        <View style={styles.trackingSection}>
          <LocationTracker />
          
          <TouchableOpacity
            style={styles.startTrackingButton}
            onPress={() => router.push("/live")}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.startTrackingText}>View Live Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Button */}
        {/* <TouchableOpacity style={styles.emergencyButton} activeOpacity={0.7}>
          <View style={styles.emergencyIcon}>
            <Ionicons name="warning" size={32} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: "bold",
                marginTop: 4,
              }}
            >
              SOS
            </Text>
          </View>
        </TouchableOpacity> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  themeToggle: {
    // Add your desired styling here
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 123, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  safetyScoreContainer: {
    alignItems: "center",
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "700",
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    maxWidth: 280,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  locationCard: {
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  compassImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  compassOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
  },
  trackingSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  trackingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  startTrackingButton: {
    backgroundColor: "#007BFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startTrackingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emergencyButton: {
    position: "absolute",
    right: 20,
    bottom: 120,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  emergencyIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
});
