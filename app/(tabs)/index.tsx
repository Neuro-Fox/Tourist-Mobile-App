import { useColorScheme } from "@/hooks/useColorScheme";
import { getPlaceInfo } from "@/utils/locationUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
import { Modal, FlatList } from "react-native";
import { Alert, DeviceEventEmitter } from "react-native";
import { ethers } from "ethers";
import CONTRACT_ABI from "@/constants/ABI.json";
import { useAuth } from "@/contexts/AuthContext";

export default function TouristSafetyApp() {
  const { isAuthenticated, signer, wallet } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      timestamp: number;
      meta?: Record<string, any>;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
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
  const handleSOSPress = () => {
    Alert.alert(
      "Emergency SOS",
      "Are you sure you want to send an emergency alert? This will notify your emergency contacts and local authorities.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: () => sendEmergencyAlert(),
        },
      ]
    );
  };

  const sendEmergencyAlert = async () => {
    try {
      // Check if user is authenticated and has a wallet
      if (!isAuthenticated || !signer || !wallet) {
        Alert.alert("Error", "Please connect your wallet and complete registration to use SOS feature.");
        return;
      }

      // Check if location is available
      if (!location) {
        Alert.alert("Error", "Location not available. Please enable location services.");
        return;
      }

      // Convert coordinates to the format expected by the contract (multiply by 1e6 for precision)
      const latitude = Math.floor(location.coords.latitude * 1000000);
      const longitude = Math.floor(location.coords.longitude * 1000000);
      
      // Emergency message
      const alertMessage = "EMERGENCY SOS - Immediate assistance required";
      
      
      // Show loading alert
      Alert.alert("Sending SOS", "Processing emergency alert...");
      
      try {
        // Create contract instance with the authenticated signer
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Call the Alert function on the smart contract
        const tx = await contract.Alert(
          alertMessage,
          wallet.address,
          latitude,
          longitude
        );
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        
        console.log("Emergency alert sent successfully:", receipt);
        
        Alert.alert(
          "SOS Alert Sent Successfully!", 
          `Emergency alert has been recorded on blockchain!\n\nTransaction: ${tx.hash}\nLocation: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}\nMessage: ${alertMessage}\n\nEmergency services and your contacts have been notified.`
        );
        
      } catch (contractError: any) {
        console.error("Contract error:", contractError);
        
        if (contractError.reason === "User not registered") {
          Alert.alert("Registration Required", "You must be registered to send emergency alerts. Please complete your registration first.");
        } else if (contractError.code === "INSUFFICIENT_FUNDS") {
          Alert.alert("Insufficient Funds", "You don't have enough ETH to send this transaction. Please add funds to your wallet.");
        } else {
          Alert.alert("Transaction Failed", `Failed to send emergency alert: ${contractError.message || contractError.reason || "Unknown error"}`);
        }
      }
      
    } catch (error: any) {
      console.error("Error sending emergency alert:", error);
      Alert.alert("Error", `Failed to send emergency alert: ${error.message || "Unknown error"}. Please try again or contact emergency services directly.`);
    }
  };

  // Blockchain event subscription (ZoneAlert + AlertEvent)
  const INFURA_WS = "wss://sepolia.infura.io/ws/v3/3ca08f13b2f94d4aa806fead92888aa8";

  const CONTRACT_ADDRESS = "0xA18fc87e627D90C470cb6C155f5da0964A1370F6";

  const wsProviderRef = useRef<ethers.WebSocketProvider | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);

  const addAlert = (alert: {
    title: string;
    message: string;
    type: string;
    timestamp?: number;
    meta?: Record<string, any>;
  }) => {
    setAlerts((prev) => {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        timestamp: alert.timestamp ?? Math.floor(Date.now() / 1000),
        meta: alert.meta,
      };
      return [item, ...prev].slice(0, 100);
    });
    setUnreadCount((c) => c + 1);
  };

  useEffect(() => {
    // Only set up once
    try {
      const ws = new ethers.WebSocketProvider(INFURA_WS);
      wsProviderRef.current = ws;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ws);
      contractRef.current = contract;

      // ZoneAlert(alertMessage, alertType, latitude, longitude, radius, timestamp)
      contract.on(
        "ZoneAlert",
        (
          alertMessage: string,
          alertType: string,
          latitude: bigint,
          longitude: bigint,
          radius: bigint,
          timestamp: bigint
        ) => {
          addAlert({
            title: `${alertType || "Zone Alert"}`,
            message: alertMessage,
            type: "zone",
            timestamp: Number(timestamp),
            meta: {
              latitude: Number(latitude),
              longitude: Number(longitude),
              radius: Number(radius),
            },
          });
        }
      );

      // AlertEvent(userAddress, name, homeAddress, phoneNumber, aadhar, passport, alertMessage, latitude, longitude, timestamp)
      contract.on(
        "AlertEvent",
        (
          userAddress: string,
          name: string,
          _homeAddress: string,
          _phone: string,
          _aadhar: string,
          _passport: string,
          alertMessage: string,
          latitude: bigint,
          longitude: bigint,
          timestamp: bigint
        ) => {
          addAlert({
            title: `User Alert: ${name}`,
            message: alertMessage,
            type: "user",
            timestamp: Number(timestamp),
            meta: {
              userAddress,
              latitude: Number(latitude),
              longitude: Number(longitude),
            },
          });
        }
      );

      return () => {
        try {
          contract.removeAllListeners();
        } catch {}
        try {
          ws.destroy();
        } catch {}
      };
    } catch (e) {
      console.warn("Failed to initialize WS provider/contract for alerts", e);
    }
  }, []);

  // In-app geofence alerts from Live screen
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "APP_GEOFENCE_ALERT",
      (payload: { title: string; message: string; type: string }) => {
        addAlert({
          title: payload.title,
          message: payload.message,
          type: payload.type || "geofence",
        });
      }
    );
    return () => sub.remove();
  }, []);

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
                style={styles.sosButton} 
                activeOpacity={0.7}
                onPress={handleSOSPress}
              >
                <Ionicons name="warning" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                  setShowNotifications(true);
                  setUnreadCount(0);
                }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={currentTheme.text}
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </Text>
                  </View>
                )}
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
      </ScrollView>

      {/* Notifications Panel */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Alerts</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={22} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={alerts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.alertItem, { borderColor: currentTheme.border }]}> 
                  <View style={styles.alertIconWrap}>
                    <Ionicons
                      name={item.type === "zone" ? "alert-circle" : item.type === "geofence" ? "map" : "person"}
                      size={18}
                      color={item.type === "zone" ? "#ff6a00" : item.type === "geofence" ? "#007BFF" : "#6f42c1"}
                    />
                  </View>
                  <View style={styles.alertTextWrap}>
                    <Text style={[styles.alertTitle]}>${""}{item.title}</Text>
                    <Text style={styles.alertMessage}>{item.message}</Text>
                    <Text style={styles.alertTime}>{new Date((item.timestamp || Math.floor(Date.now()/1000)) * 1000).toLocaleString()}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyWrap}>
                  <Text>No alerts yet</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
    flexDirection: "row",
    gap:12,
    alignItems: "center",
    justifyContent: "center",
  },
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff3b30",
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "70%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  alertItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  alertIconWrap: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
    paddingTop: 2,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 13,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: "#6C757D",
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
  },
});
