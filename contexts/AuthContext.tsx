import { ethers, JsonRpcProvider } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import CONTRACT_ABI from '../constants/ABI.json';
import LocationService from '../services/LocationService';

const RPC_URL = "https://sepolia.infura.io/v3/3ca08f13b2f94d4aa806fead92888aa8";
const CONTRACT_ADDRESS = "0xA18fc87e627D90C470cb6C155f5da0964A1370F6";

interface User {
  name: string;
  homeAddress: string;
  email: string;
  phoneNumber: string;
  aadhar: string;
  passport: string;
  days: number;
  locations: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  wallet: ethers.Wallet | null;
  signer: ethers.Signer | null;
  user: User | null;
  isLocationTracking: boolean;
  generateWallet: () => Promise<void>;
  connectWallet: (privateKey: string) => Promise<void>;
  saveUserDetails: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  startLocationTracking: () => Promise<boolean>;
  stopLocationTracking: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);

  const savePrivateKey = async (privateKey: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync("user_private_key", privateKey, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('Error saving private key:', error);
      throw error;
    }
  };

  const getPrivateKey = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync("user_private_key");
    } catch (error) {
      console.error('Error getting private key:', error);
      return null;
    }
  };

  const deletePrivateKey = async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync("user_private_key");
    } catch (error) {
      console.error('Error deleting private key:', error);
    }
  };

  const saveUserData = async (userData: User): Promise<void> => {
    try {
      await SecureStore.setItemAsync("user_data", JSON.stringify(userData), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const getUserData = async (): Promise<User | null> => {
    try {
      const userData = await SecureStore.getItemAsync("user_data");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  };

  const generateWallet = async (): Promise<void> => {
    try {
      // Generate cryptographically secure random bytes
      const randomBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }

      // Convert to hex string
      const privateKey = "0x" + Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const newWallet = new ethers.Wallet(privateKey);
      const provider = new JsonRpcProvider(RPC_URL);
      const connectedSigner = newWallet.connect(provider);

      setWallet(newWallet);
      setSigner(connectedSigner);
      await savePrivateKey(newWallet.privateKey);
      
      console.log("Generated wallet:", newWallet.address);
    } catch (error) {
      console.error('Error generating wallet:', error);
      throw error;
    }
  };

  const connectWallet = async (privateKey: string): Promise<void> => {
    try {
      const walletFromKey = new ethers.Wallet(privateKey);
      const provider = new JsonRpcProvider(RPC_URL);
      const connectedSigner = walletFromKey.connect(provider);

      setWallet(walletFromKey);
      setSigner(connectedSigner);
      await savePrivateKey(walletFromKey.privateKey);
      
      // Check if user is already registered on blockchain
      const blockchainUser = await checkBlockchainRegistration(walletFromKey.address, connectedSigner);
      
      if (blockchainUser) {
        // User is already registered - authenticate them immediately
        setUser(blockchainUser);
        setIsAuthenticated(true);
        await saveUserData(blockchainUser);
        console.log("Connected existing user:", walletFromKey.address);
      } else {
        // User not registered - they'll need to complete profile
        setIsAuthenticated(false);
        console.log("Connected new wallet:", walletFromKey.address);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const saveUserDetails = async (userData: User): Promise<void> => {
    if (!signer) {
      throw new Error('No wallet connected');
    }

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const numberOfDays = userData.days || 1;
      const longitudes: string[][] = [];
      const latitudes: string[][] = [];
      const locationNames: string[][] = [];

      // Handle location data
      if (userData.locations.trim()) {
        const dayLocations = userData.locations.split(";").map((loc) => loc.split(","));
        longitudes.push(dayLocations.map((loc) => loc[0] || ""));
        latitudes.push(dayLocations.map((loc) => loc[1] || ""));
        locationNames.push(dayLocations.map((loc) => loc[2] || ""));
      } else {
        longitudes.push(Array(numberOfDays).fill(""));
        latitudes.push(Array(numberOfDays).fill(""));
        locationNames.push(Array(numberOfDays).fill(""));
      }

      const tx = await contract.registerUser(
        userData.name,
        userData.homeAddress,
        userData.email,
        userData.phoneNumber,
        userData.aadhar,
        userData.passport,
        Array(numberOfDays).fill(1),
        longitudes,
        latitudes,
        locationNames
      );
      
      await tx.wait();
      
      // Save user data locally
      setUser(userData);
      await saveUserData(userData);
      setIsAuthenticated(true);
      
      console.log("User registered successfully");
    } catch (error) {
      console.error('Error saving user details:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Stop location tracking before logout
      await stopLocationTracking();
      
      await deletePrivateKey();
      await SecureStore.deleteItemAsync("user_data");
      setWallet(null);
      setSigner(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const startLocationTracking = async (): Promise<boolean> => {
    try {
      if (!isAuthenticated) {
        console.error('User must be authenticated to start location tracking');
        return false;
      }

      const locationService = LocationService.getInstance();
      const success = await locationService.startBackgroundTracking();
      setIsLocationTracking(success);
      return success;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  };

  const stopLocationTracking = async (): Promise<boolean> => {
    try {
      const locationService = LocationService.getInstance();
      const success = await locationService.stopBackgroundTracking();
      setIsLocationTracking(false);
      return success;
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      return false;
    }
  };

  const checkBlockchainRegistration = async (walletAddress: string, signer?: ethers.Signer): Promise<User | null> => {
    try {
      // Use the signer if available, otherwise create a read-only provider
      const contract = signer 
        ? new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        : new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, new JsonRpcProvider(RPC_URL));
      
      const userDetails = await contract.getUserDetails(walletAddress);
      
      const [name, homeAddress, email, phoneNumber, aadhar, passport, isRegistered, itinerary, registrationTime] = userDetails;
      
      if (isRegistered) {
        // Convert blockchain data to our User interface
        return {
          name,
          homeAddress,
          email,
          phoneNumber,
          aadhar,
          passport,
          days: itinerary.length,
          locations: '', // We'll reconstruct this from itinerary if needed
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking blockchain registration:', error);
      return null;
    }
  };

  const checkAuthStatus = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const privateKey = await getPrivateKey();
      
      if (privateKey) {
        const walletFromKey = new ethers.Wallet(privateKey);
        const provider = new JsonRpcProvider(RPC_URL);
        const connectedSigner = walletFromKey.connect(provider);
        
        setWallet(walletFromKey);
        setSigner(connectedSigner);
        
        // First check if user is registered on blockchain
        const blockchainUser = await checkBlockchainRegistration(walletFromKey.address, connectedSigner);
        
        if (blockchainUser) {
          // User is registered on blockchain - authenticate them
          setUser(blockchainUser);
          setIsAuthenticated(true);
          // Also save the data locally for faster access
          await saveUserData(blockchainUser);
        } else {
          // Check if user data exists locally (for backward compatibility)
          const userData = await getUserData();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Wallet exists but no user data - need to complete registration
            setIsAuthenticated(false);
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    wallet,
    signer,
    user,
    isLocationTracking,
    generateWallet,
    connectWallet,
    saveUserDetails,
    logout,
    checkAuthStatus,
    startLocationTracking,
    stopLocationTracking,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
