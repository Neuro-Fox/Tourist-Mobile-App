import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ethers, JsonRpcProvider } from "ethers";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CONTRACT_ABI from "../../constants/ABI.json";

const RPC_URL = "https://sepolia.infura.io/v3/3ca08f13b2f94d4aa806fead92888aa8";
const CONTRACT_ADDRESS = "0x3F3553d17e0708A0C093630E878EADe1263C8ffd";

export default function UserFormPage() {
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [name, setName] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [passport, setPassport] = useState("");
  const [days, setDays] = useState<string>("1");
  const [locations, setLocations] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
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

  const getAllRegisteredUsers = async () => {
    if (!signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      console.log("Calling getAllRegisteredUsers...");
      const users = await contract.getAllRegisteredUsers();

      console.log("Retrieved users:", users);

      Alert.alert(
        "Success",
        `Retrieved ${users.length} registered users. Check console for details.`
      );
    } catch (err) {
      console.error("Error fetching users:", err);
      Alert.alert("Error", "Failed to fetch users. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateWallet = () => {
    try {
      // Simple alternative: generate using a pre-made private key approach
      const randomBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }

      // Convert to hex string
      const privateKey =
        "0x" +
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      const newWallet = new ethers.Wallet(privateKey);
      setWallet(newWallet);
      console.log("Private Key:", newWallet.privateKey);
      console.log("Public Address:", newWallet.address);
      savePrivateKey(newWallet.privateKey);
      Alert.alert("Success", "Wallet generated successfully!");
    } catch (err) {
      console.error("Error generating wallet:", err);
      Alert.alert("Error", "Failed to generate wallet. Please try again.");
    }
  };

  async function savePrivateKey(key: string) {
    await SecureStore.setItemAsync("user_private_key", key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async function getPrivateKey() {
    return await SecureStore.getItemAsync("user_private_key");
  }

  async function deletePrivateKey() {
    await SecureStore.deleteItemAsync("user_private_key");
  }

  useEffect(() => {
    checkForSavedWallet();
  }, []);

  const checkForSavedWallet = async () => {
    try {
      const savedPrivateKey = await getPrivateKey();
      if (savedPrivateKey) {
        console.log("Found saved private key, connecting wallet...");
        const walletFromKey = new ethers.Wallet(savedPrivateKey);
        const provider = new JsonRpcProvider(RPC_URL);
        const connectedSigner = walletFromKey.connect(provider);
        setWallet(walletFromKey);
        setSigner(connectedSigner);
        console.log("Connected to saved wallet:", walletFromKey.address);
      }
    } catch (err) {
      console.error("Error loading saved wallet:", err);
      // If there's an error with the saved key, delete it
      await deletePrivateKey();
    }
  };

  // Modify the connectWallet function to handle both manual and saved keys
  const connectWallet = async (manualKey?: string) => {
    try {
      const keyToUse = manualKey || privateKeyInput.trim();
      if (!keyToUse) {
        Alert.alert("Error", "Please enter a private key");
        return;
      }
      const walletFromKey = new ethers.Wallet(keyToUse);
      const provider = new JsonRpcProvider(RPC_URL);
      const connectedSigner = walletFromKey.connect(provider);
      setWallet(walletFromKey);
      setSigner(connectedSigner);
      await savePrivateKey(walletFromKey.privateKey);
      if (!manualKey) {
        Alert.alert("Success", "Wallet connected successfully!");
      }
      console.log("Connected Wallet:", walletFromKey.address);
    } catch (err) {
      console.error("Invalid private key:", err);
      Alert.alert("Error", "Invalid private key. Please check and try again.");
    }
  };

  const submitUserDetails = async () => {
    if (!signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    // All fields are now optional - no validation required

    setIsLoading(true);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );
    const numberOfDays = parseInt(days) || 1; // Default to 1 day if empty
    const longitudes: string[][] = [];
    const latitudes: string[][] = [];
    const locationNames: string[][] = [];

    // Handle optional location data
    if (locations.trim()) {
      const dayLocations = locations.split(";").map((loc) => loc.split(","));
      longitudes.push(dayLocations.map((loc) => loc[0] || ""));
      latitudes.push(dayLocations.map((loc) => loc[1] || ""));
      locationNames.push(dayLocations.map((loc) => loc[2] || ""));
    } else {
      // Default empty location for the number of days
      longitudes.push(Array(numberOfDays).fill(""));
      latitudes.push(Array(numberOfDays).fill(""));
      locationNames.push(Array(numberOfDays).fill(""));
    }

    try {
      const tx = await contract.registerUser(
        name,
        homeAddress,
        email,
        phoneNumber,
        aadhar,
        passport,
        Array(numberOfDays).fill(1),
        longitudes,
        latitudes,
        locationNames
      );
      await tx.wait();
      Alert.alert("Success", "User registered successfully!");
      // Reset form
      setName("");
      setHomeAddress("");
      setEmail("");
      setPhoneNumber("");
      setAadhar("");
      setPassport("");
      setDays("1");
      setLocations("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to register user. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
    input: {
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colorScheme === "dark" ? "#2a2a2a" : "#ffffff",
      color: colors.text,
    },
    multilineInput: {
      height: 80,
      textAlignVertical: "top",
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
    buttonDisabled: {
      backgroundColor: colors.icon,
      opacity: 0.6,
    },
    toggleButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.tint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    formRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    halfWidth: {
      flex: 1,
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
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title">Tourist Registration</ThemedText>
          <ThemedText
            style={{ marginTop: 8, textAlign: "center", opacity: 0.7 }}
          >
            Create or connect your wallet, then fill in any optional details
          </ThemedText>
        </View>

        {/* Wallet Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔐 Wallet Setup
          </ThemedText>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={generateWallet}
          >
            <ThemedText style={styles.buttonTextSecondary}>
              Generate New Wallet
            </ThemedText>
          </TouchableOpacity>

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

          <TextInput
            style={styles.input}
            placeholder="Or enter existing private key"
            placeholderTextColor={colors.icon}
            value={privateKeyInput}
            onChangeText={setPrivateKeyInput}
            secureTextEntry={true}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              connectWallet();
            }}
            disabled={!privateKeyInput.trim()}
          >
            <ThemedText style={styles.buttonText}>Connect Wallet</ThemedText>
          </TouchableOpacity>

          {/* Test Button - Get All Users */}
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={getAllRegisteredUsers}
            disabled={!signer || isLoading}
          >
            <ThemedText style={styles.buttonTextSecondary}>
              🔍 Get All Users (Test)
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            👤 Personal Information (Optional)
          </ThemedText>

          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginBottom: 15 }}>
            Fill in any details you'd like to include in your registration
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.icon}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={colors.icon}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.icon}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Home Address"
            placeholderTextColor={colors.icon}
            value={homeAddress}
            onChangeText={setHomeAddress}
            multiline={true}
          />

          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Aadhar Number"
              placeholderTextColor={colors.icon}
              value={aadhar}
              onChangeText={setAadhar}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Passport Number"
              placeholderTextColor={colors.icon}
              value={passport}
              onChangeText={setPassport}
            />
          </View>
        </View>

        {/* Travel Information Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            ✈️ Travel Information (Optional)
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Number of Days"
            placeholderTextColor={colors.icon}
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Locations (longitude,latitude,name;...)"
            placeholderTextColor={colors.icon}
            value={locations}
            onChangeText={setLocations}
            multiline={true}
          />

          <ThemedText
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: -10,
              marginBottom: 15,
            }}
          >
            Format: longitude,latitude,name separated by semicolons for multiple
            locations
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!signer || isLoading) && styles.buttonDisabled,
          ]}
          onPress={submitUserDetails}
          disabled={!signer || isLoading}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? "Registering..." : "Complete Registration"}
          </ThemedText>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
