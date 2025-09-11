import React from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../hooks/useColorScheme';
import { ThemedText } from './ThemedText';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 16, opacity: 0.7 }}>
          Checking authentication...
        </ThemedText>
      </View>
    );
  }

  // If not authenticated, show registration flow
  if (!isAuthenticated) {
    return <RegistrationFlow />;
  }

  // If authenticated, show the main app
  return <>{children}</>;
};

// Registration Flow Component
const RegistrationFlow: React.FC = () => {
  const { wallet, signer, generateWallet, connectWallet, saveUserDetails } = useAuth();
  const [privateKeyInput, setPrivateKeyInput] = React.useState('');
  const [userData, setUserData] = React.useState({
    name: '',
    homeAddress: '',
    email: '',
    phoneNumber: '',
    aadhar: '',
    passport: '',
    days: 1,
    locations: '',
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPrivateKey, setShowPrivateKey] = React.useState(false);
  const [step, setStep] = React.useState<'wallet' | 'details'>('wallet');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isAadharVerified, setIsAadharVerified] = React.useState(true);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleGenerateWallet = async () => {
    try {
      await generateWallet();
    } catch (error) {
      console.error('Error generating wallet:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setIsLoading(true);
      await connectWallet(privateKeyInput);
      setPrivateKeyInput('');
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (wallet && signer) {
      setStep('details');
    }
  };

  const handleSubmitDetails = async () => {
    try {
      setIsLoading(true);
      await saveUserDetails(userData);
    } catch (error) {
      console.error('Error submitting details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(text);
      // You might want to show a toast or alert here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const verifyAadhar = async () => {
    if (!userData.aadhar.trim()) {
      return;
    }

    if (userData.aadhar.length !== 12) {
      return;
    }

    try {
      setIsVerifying(true);
      
      const response = await fetch('https://api.apyhub.com/validate/aadhaar', {
        method: 'POST',
        headers: {
          'apy-token': 'APY0LMvKWEAM7qApkvvCBU18R1sSDCKNkEWlCul4IQCdXPr1dD9Mla3o0MgXUhZSag4Un', 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: userData.aadhar
        })
      });

      const result = await response.json();

      if (response.ok && result.data === true) {
        setIsAadharVerified(true);
      } else {
        setIsAadharVerified(false);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setIsAadharVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      marginBottom: 30,
      alignItems: 'center' as const,
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
    input: {
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#404040' : '#e0e0e0',
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#ffffff',
      color: colors.text,
    },
    button: {
      backgroundColor: colors.tint,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center' as const,
      marginVertical: 8,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.tint,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    buttonTextSecondary: {
      color: colors.tint,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    walletInfo: {
      backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      padding: 15,
      borderRadius: 8,
      marginVertical: 10,
    },
    stepIndicator: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      marginBottom: 30,
    },
    step: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginHorizontal: 5,
    },
    activeStep: {
      backgroundColor: colors.tint,
    },
    inactiveStep: {
      backgroundColor: colors.icon,
      opacity: 0.3,
    },
    stepText: {
      color: '#ffffff',
      fontWeight: '600' as const,
    },
    formRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    halfWidth: {
      flex: 1,
    },
    verifyContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginTop: -10,
      marginBottom: 15,
    },
    verifyButton: {
      backgroundColor: colors.tint,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 6,
      marginRight: 10,
    },
    verifyButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    verifiedContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    verifiedText: {
      color: '#28a745',
      fontSize: 14,
      fontWeight: '600' as const,
      marginLeft: 5,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Welcome to Tourist App</ThemedText>
        <ThemedText style={{ marginTop: 8, textAlign: 'center', opacity: 0.7 }}>
          {step === 'wallet' 
            ? 'Set up your wallet to get started' 
            : 'Complete your profile information'
          }
        </ThemedText>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.step, step === 'wallet' ? styles.activeStep : styles.inactiveStep]}>
          <ThemedText style={styles.stepText}>1. Wallet</ThemedText>
        </View>
        <View style={[styles.step, step === 'details' ? styles.activeStep : styles.inactiveStep]}>
          <ThemedText style={styles.stepText}>2. Profile</ThemedText>
        </View>
      </View>

      {step === 'wallet' ? (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
            🔐 Wallet Setup
          </ThemedText>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleGenerateWallet}
          >
            <ThemedText style={styles.buttonTextSecondary}>
              Generate New Wallet
            </ThemedText>
          </TouchableOpacity>

          {wallet && (
            <View style={styles.walletInfo}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 5 }}>
                Wallet Address:
              </ThemedText>
              <ThemedText style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {wallet.address}
              </ThemedText>
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
            style={[styles.button, isLoading && { opacity: 0.6 }]}
            onPress={handleConnectWallet}
            disabled={!privateKeyInput.trim() || isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </ThemedText>
          </TouchableOpacity>

          {wallet && signer && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleNextStep}
            >
              <ThemedText style={styles.buttonText}>Continue to Profile</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
            👤 Profile Information
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.icon}
            value={userData.name}
            onChangeText={(text) => setUserData({ ...userData, name: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={colors.icon}
            value={userData.email}
            onChangeText={(text) => setUserData({ ...userData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.icon}
            value={userData.phoneNumber}
            onChangeText={(text) => setUserData({ ...userData, phoneNumber: text })}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Home Address"
            placeholderTextColor={colors.icon}
            value={userData.homeAddress}
            onChangeText={(text) => setUserData({ ...userData, homeAddress: text })}
            multiline={true}
          />

          <View style={styles.formRow}>
            <View style={styles.halfWidth}>
              <TextInput
                style={styles.input}
                placeholder="Aadhaar Number (12 digits)"
                placeholderTextColor={colors.icon}
                value={userData.aadhar}
                onChangeText={(text) => {
                  setUserData({ ...userData, aadhar: text });
                  setIsAadharVerified(false); // Reset verification when text changes
                }}
                keyboardType="numeric"
                maxLength={12}
              />
              
              {/* Aadhaar Verification UI */}
              <View style={styles.verifyContainer}>
                {!isAadharVerified && userData.aadhar.length === 12 && (
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={verifyAadhar}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.verifyButtonText}>Verify</ThemedText>
                    )}
                  </TouchableOpacity>
                )}
                
                {isAadharVerified && (
                  <View style={styles.verifiedContainer}>
                    <ThemedText style={{ fontSize: 20 }}>✅</ThemedText>
                    <ThemedText style={styles.verifiedText}>Verified</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Number of Days"
            placeholderTextColor={colors.icon}
            value={userData.days.toString()}
            onChangeText={(text) => setUserData({ ...userData, days: parseInt(text) || 1 })}
            keyboardType="numeric"
          />

          {/* Verify Documents Button */}
          {userData.aadhar.trim().length > 0 && !isAadharVerified && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, isVerifying && { opacity: 0.6 }]}
              onPress={verifyAadhar}
              disabled={isVerifying}
            >
              <ThemedText style={styles.buttonTextSecondary}>
                {isVerifying ? 'Verifying...' : 'Verify Documents'}
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Complete Registration Button */}
          <TouchableOpacity
            style={[
              styles.button, 
              isLoading && { opacity: 0.6 },
              (userData.aadhar.trim().length > 0 && !isAadharVerified) && { opacity: 0.6 }
            ]}
            onPress={handleSubmitDetails}
            disabled={isLoading || (userData.aadhar.trim().length > 0 && !isAadharVerified)}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Completing Registration...' : 'Complete Registration'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
