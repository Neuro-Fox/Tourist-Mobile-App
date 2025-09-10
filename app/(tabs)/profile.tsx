import React from "react";
import { Text, View } from "react-native";
import { ethers } from "ethers";
import CONTRACT_ABI from "../../constants/ABI.json";
const RPC_URL = "https://sepolia.infura.io/v3/3ca08f13b2f94d4aa806fead92888aa8";
const CONTRACT_ADDRESS = "0x3F3553d17e0708A0C093630E878EADe1263C8ffd";
import { Alert } from "react-native";

const getUserDetails = async () => {
  try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI);
      
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
    }
}

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile</Text>

    </View>
  );
}
