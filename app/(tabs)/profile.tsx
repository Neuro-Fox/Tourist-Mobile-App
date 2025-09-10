import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfilePage() {
  const { wallet, user, logout } = useAuth();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied!", `${label} copied to clipboard`);
    } catch (err) {
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout? You'll need to reconnect your wallet to access the app again.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      marginBottom: 30,
      alignItems: "center",
    },
    section: {
      marginBottom: 25,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionTitle: {
      marginBottom: 15,
      textAlign: "left",
    },
    walletInfo: {
      backgroundColor: colorScheme === "dark" ? "#2a2a2a" : "#f8f9fa",
      padding: 15,
      borderRadius: 8,
      marginVertical: 10,
    },
    walletLabel: {
      marginBottom: 5,
    },
    walletValue: {
      fontFamily: "monospace",
      fontSize: 12,
    },
    button: {
      backgroundColor: colors.tint,
      padding: 15,
      borderRadius: 8,
      alignItems: "center",
      marginVertical: 8,
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.tint,
    },
    buttonDanger: {
      backgroundColor: "#ff4444",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: colors.tint,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextDanger: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    toggleButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.tint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    walletRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
    },
    copyButton: {
      backgroundColor: colors.tint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    copyButtonText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "600",
    },
    toggleButtonText: {
      color: colors.tint,
      fontSize: 12,
      fontWeight: "600",
    },
    userInfo: {
      backgroundColor: colorScheme === "dark" ? "#2a2a2a" : "#f8f9fa",
      padding: 15,
      borderRadius: 8,
      marginVertical: 5,
    },
    userLabel: {
      marginBottom: 5,
      fontWeight: "600",
    },
    userValue: {
      fontSize: 14,
      opacity: 0.8,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText
          style={{ marginTop: 8, textAlign: "center", opacity: 0.7 }}
        >
          Manage your account and wallet information
        </ThemedText>
      </View>

      {/* Wallet Information */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          🔐 Wallet Information
        </ThemedText>

        {wallet && (
          <View style={styles.walletInfo}>
            <View style={styles.walletRow}>
              <ThemedText style={styles.walletLabel} type="defaultSemiBold">
                Wallet Address:
              </ThemedText>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  copyToClipboard(wallet.address, "Wallet Address")
                }
              >
                <ThemedText style={styles.copyButtonText}>📋 Copy</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.walletValue}>
              {wallet.address}
            </ThemedText>

            <View style={{ marginTop: 15 }}>
              <View style={styles.walletRow}>
                <ThemedText style={styles.walletLabel} type="defaultSemiBold">
                  Private Key:
                </ThemedText>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    <ThemedText style={styles.toggleButtonText}>
                      {showPrivateKey ? "👁️‍🗨️ Hide" : "👁️ Show"}
                    </ThemedText>
                  </TouchableOpacity>
                  {showPrivateKey && (
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() =>
                        copyToClipboard(wallet.privateKey, "Private Key")
                      }
                    >
                      <ThemedText style={styles.copyButtonText}>
                        📋 Copy
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <ThemedText style={styles.walletValue}>
                {showPrivateKey ? wallet.privateKey : "•".repeat(64)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* User Information */}
      {user && (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            👤 Personal Information
          </ThemedText>

          {user.name && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Name:</ThemedText>
              <ThemedText style={styles.userValue}>{user.name}</ThemedText>
            </View>
          )}

          {user.email && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Email:</ThemedText>
              <ThemedText style={styles.userValue}>{user.email}</ThemedText>
            </View>
          )}

          {user.phoneNumber && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Phone:</ThemedText>
              <ThemedText style={styles.userValue}>{user.phoneNumber}</ThemedText>
            </View>
          )}

          {user.homeAddress && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Address:</ThemedText>
              <ThemedText style={styles.userValue}>{user.homeAddress}</ThemedText>
            </View>
          )}

          {user.aadhar && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Aadhar:</ThemedText>
              <ThemedText style={styles.userValue}>{user.aadhar}</ThemedText>
            </View>
          )}

          {user.passport && (
            <View style={styles.userInfo}>
              <ThemedText style={styles.userLabel}>Passport:</ThemedText>
              <ThemedText style={styles.userValue}>{user.passport}</ThemedText>
            </View>
          )}

          <View style={styles.userInfo}>
            <ThemedText style={styles.userLabel}>Travel Days:</ThemedText>
            <ThemedText style={styles.userValue}>{user.days} days</ThemedText>
          </View>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.button, styles.buttonDanger]}
        onPress={handleLogout}
      >
        <ThemedText style={styles.buttonTextDanger}>
          🚪 Logout
        </ThemedText>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}