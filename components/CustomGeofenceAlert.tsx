import { MaterialIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useThemeColor } from "../hooks/useThemeColor";
import { ThemedText } from "./ThemedText";

interface CustomGeofenceAlertProps {
  visible: boolean;
  onClose: () => void;
  locationName?: string;
}

export default function CustomGeofenceAlert({
  visible,
  onClose,
  locationName = "Tourist Location",
}: CustomGeofenceAlertProps) {
  const backgroundColor = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "background"
  );
  const textColor = useThemeColor(
    { light: "#000000", dark: "#FFFFFF" },
    "text"
  );
  const tintColor = useThemeColor(
    { light: "#2196F3", dark: "#4FB3FF" },
    "tint"
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor }]}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="location-on" size={40} color={tintColor} />
          </View>

          <ThemedText style={styles.title}>
            Welcome to {locationName}!
          </ThemedText>

          <ThemedText style={styles.message}>
            You've arrived at your destination. Explore and enjoy your visit!
          </ThemedText>

          <Pressable
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={onClose}
          >
            <ThemedText style={styles.buttonText}>Got it</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "85%",
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    borderRadius: 12,
    padding: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
