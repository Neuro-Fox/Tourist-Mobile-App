import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    address?: string;
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface MapboxGeocodingResponse {
  type: string;
  features: MapboxFeature[];
  attribution: string;
}

export default function Itinerary() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MapboxFeature | null>(
    null
  );

  // Replace with your Mapbox access token
  const accessToken = `pk.eyJ1Ijoidm1ha2V0ZWNoMDAiLCJhIjoiY21mZDBjcHloMDQxbDJpb2Jla2psYXRmNSJ9.YAlk_su9JHf6qBWe8jnUxw`;
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const [hasTokenError, setHasTokenError] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      console.warn(
        "Mapbox access token is missing. Please check your environment variables."
      );
      setHasTokenError(true);
      Alert.alert(
        "Configuration Error",
        "Mapbox access token is missing. Map functionality will be limited.",
        [{ text: "OK" }]
      );
    } else {
      setHasTokenError(false);
    }
  }, [accessToken]);

  // Get current location
  useEffect(() => {
    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Location permission is required to show your current location on the map."
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);

        // Animate to current location
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            1000
          );
        }
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert("Error", "Unable to get your current location.");
      }
    }
    getCurrentLocation();
  }, []);

  // Mapbox Geocoding API - Forward Geocoding (search for places)
  const searchPlaces = async (query: string) => {
    if (!query.trim() || !accessToken) return;

    setIsLoading(true);
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json`;
      const params = new URLSearchParams({
        access_token: accessToken,
        limit: "5",
        types: "place,poi,address",
        autocomplete: "true",
      });

      const response = await fetch(`${endpoint}?${params}`);
      const data: MapboxGeocodingResponse = await response.json();

      if (response.ok && data.features) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      } else {
        console.error("Mapbox geocoding error:", data);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert(
        "Network Error",
        "Please check your internet connection and try again."
      );
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search handler for autocomplete
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchQuery.length > 2) {
      debounceTimeout.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, accessToken]);

  // Select a place from suggestions
  const selectPlace = (place: MapboxFeature) => {
    const [longitude, latitude] = place.center;

    // Update location
    setLocation({
      coords: {
        latitude,
        longitude,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
      mocked: false,
    } as Location.LocationObject);

    // Update UI
    setSelectedPlace(place);
    setSearchQuery(place.place_name);
    setShowSuggestions(false);
    Keyboard.dismiss();

    // Animate map to selected location
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      );
    }
  };

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedPlace(null);
    }
  };

  // Handle manual search (when user presses search button)
  const handleSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return;

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json`;
      const params = new URLSearchParams({
        access_token: accessToken,
        limit: "1",
      });

      const response = await fetch(`${endpoint}?${params}`);
      const data: MapboxGeocodingResponse = await response.json();

      if (response.ok && data.features && data.features.length > 0) {
        const place = data.features[0];
        selectPlace(place);
      } else {
        Alert.alert(
          "No Results",
          "No places found for your search. Please try a different search term."
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert(
        "Network Error",
        "Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse Geocoding - Get place name from coordinates
  const reverseGeocode = async (latitude: number, longitude: number) => {
    if (!accessToken) return;

    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
      const params = new URLSearchParams({
        access_token: accessToken,
        types: "place,poi,address",
      });

      const response = await fetch(`${endpoint}?${params}`);
      const data: MapboxGeocodingResponse = await response.json();

      if (response.ok && data.features && data.features.length > 0) {
        const place = data.features[0];
        setSearchQuery(place.place_name);
        setSelectedPlace(place);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  // Handle map press (reverse geocoding)
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({
      coords: {
        latitude,
        longitude,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
      mocked: false,
    } as Location.LocationObject);

    reverseGeocode(latitude, longitude);
  };

  const initialRegion = {
    latitude: location?.coords.latitude || 40.7128,
    longitude: location?.coords.longitude || -74.006,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      {hasTokenError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Mapbox Token Missing - Limited Functionality
          </Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search for places..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          editable={!isLoading}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => selectPlace(item)}
                >
                  <Text style={styles.suggestionMainText}>
                    {item.place_name.split(",")[0]}
                  </Text>
                  <Text style={styles.suggestionSecondaryText}>
                    {item.place_name.split(",").slice(1).join(",").trim()}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onPress={handleMapPress}
        mapType="standard"
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={
              selectedPlace?.place_name.split(",")[0] || "Selected Location"
            }
            description={
              selectedPlace?.place_name.split(",").slice(1).join(",").trim() ||
              "Tap to select a location"
            }
          />
        )}
      </MapView>

      {selectedPlace && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>
            {selectedPlace.place_name.split(",")[0]}
          </Text>
          <Text style={styles.infoAddress}>
            {selectedPlace.place_name.split(",").slice(1).join(",").trim()}
          </Text>
          <Text style={styles.coordinates}>
            {location?.coords.latitude.toFixed(6)},{" "}
            {location?.coords.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    padding: 8,
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 0,
    zIndex: 100,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "bold",
  },
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    maxHeight: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    position: "absolute",
    bottom: 30,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  infoAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  coordinates: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    fontFamily: "monospace",
  },
});
