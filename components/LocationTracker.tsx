import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';

export const LocationTracker: React.FC = () => {
  const { isAuthenticated, isLocationTracking, startLocationTracking, stopLocationTracking } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleToggleLocationTracking = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to enable location tracking for safety monitoring.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isLocationTracking) {
        const success = await stopLocationTracking();
        if (success) {
          Alert.alert('Success', 'Location tracking stopped.');
        } else {
          Alert.alert('Error', 'Failed to stop location tracking.');
        }
      } else {
        const success = await startLocationTracking();
        if (success) {
          Alert.alert(
            'Location Tracking Started',
            'Your location will be sent to the safety monitoring system every 10 minutes to ensure your safety during travel.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Please grant location permissions in your device settings to enable safety monitoring.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
      Alert.alert('Error', 'An error occurred while updating location tracking settings.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemedView style={{
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 4 }}>
            🛡️ Safety Monitoring
          </ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
            {isLocationTracking 
              ? 'Your location is being monitored for safety' 
              : 'Enable location tracking for safety monitoring'
            }
          </ThemedText>
        </View>
        
        <Switch
          value={isLocationTracking}
          onValueChange={handleToggleLocationTracking}
          disabled={isLoading}
          trackColor={{ 
            false: colors.icon + '40', 
            true: colors.tint + '80' 
          }}
          thumbColor={isLocationTracking ? colors.tint : colors.icon}
        />
      </View>
      
      {isLocationTracking && (
        <ThemedText style={{ 
          fontSize: 11, 
          opacity: 0.6, 
          marginTop: 8,
          fontStyle: 'italic'
        }}>
          Location data is sent every 10 minutes to the AI safety system
        </ThemedText>
      )}
    </ThemedView>
  );
};

export default LocationTracker;
