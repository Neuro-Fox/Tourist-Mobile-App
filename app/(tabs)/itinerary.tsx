import { IconSymbol } from "@/components/ui/IconSymbol";
import { getPlaceInfo, searchPlaces } from "@/utils/locationUtils";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface GooglePlace {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface SelectedPlace {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  image?: string;
  day: number;
}

const themes = {
  light: {
    background: "#FFFFFF",
    headerBackground: "#F8F9FA",
    text: "#212529",
    subText: "#6C757D",
    cardBackground: "#FFFFFF",
    border: "#E9ECEF",
    statusBar: "dark-content" as const,
    tabActiveBackground: "#00BCD4",
    tabInactiveBackground: "#E9ECEF",
    tabActiveText: "#FFFFFF",
    tabInactiveText: "#6C757D",
  },
  dark: {
    background: "#1A1B23",
    headerBackground: "#2D2E36",
    text: "#FFFFFF",
    subText: "#B8BCC8",
    cardBackground: "#2D2E36",
    border: "#404040",
    statusBar: "light-content" as const,
    tabActiveBackground: "#00BCD4",
    tabInactiveBackground: "#404040",
    tabActiveText: "#FFFFFF",
    tabInactiveText: "#B8BCC8",
  },
};

export default function Itinerary() {
  const colorScheme = useColorScheme();
  const theme = themes[colorScheme ?? "light"];

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GooglePlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [numberOfDays, setNumberOfDays] = useState(3);
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<SelectedPlace[]>([]);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

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

        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
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

  // Search for places using locationUtils
  const handlePlaceSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const places = await searchPlaces(query);
      setSuggestions(places);
      setShowSuggestions(true);
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
        handlePlaceSearch(searchQuery);
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
  }, [searchQuery]);

  // Select a place from suggestions
  const selectPlace = async (place: GooglePlace) => {
    const { lat, lng } = place.geometry.location;

    setLocation({
      coords: {
        latitude: lat,
        longitude: lng,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
      mocked: false,
    } as Location.LocationObject);

    // Get place info including image using locationUtils
    try {
      const placeInfo = await getPlaceInfo(lat, lng);
      const placeWithImage = {
        ...place,
        photo_url: placeInfo.photoUrl,
      };
      setSelectedPlace(placeWithImage);
    } catch (error) {
      console.error("Error getting place info:", error);
      setSelectedPlace(place);
    }

    setSearchQuery(place.name);
    setShowSuggestions(false);
    Keyboard.dismiss();

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedPlace(null);
    }
  };

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
  };

  const addPlaceToItinerary = () => {
    if (selectedPlace) {
      const newPlace: SelectedPlace = {
        id: Date.now().toString(),
        name: selectedPlace.name,
        description: selectedPlace.formatted_address,
        coordinates: [
          selectedPlace.geometry.location.lng,
          selectedPlace.geometry.location.lat,
        ],
        image: (selectedPlace as any).photo_url,
        day: activeDay,
      };
      setSelectedPlaces((prev) => [...prev, newPlace]);
      // Clear the search bar and related states
      setSearchQuery("");
      setSelectedPlace(null);
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const removePlaceFromItinerary = (id: string) => {
    setSelectedPlaces((prev) => prev.filter((place) => place.id !== id));
  };

  const initialRegion = {
    latitude: 37.7749, // San Francisco default
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Organize places by day
  const organizedPlaces = selectedPlaces.reduce(
    (acc, place) => {
      if (!acc[place.day]) {
        acc[place.day] = [];
      }
      acc[place.day].push(place);
      return acc;
    },
    {} as Record<number, SelectedPlace[]>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor={theme.headerBackground}
      />

      {/* Day Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabHeaderContainer}>
          <Text style={styles.tabHeaderText}>Itinerary Days</Text>
          <TouchableOpacity
            style={styles.editDaysButton}
            onPress={() => setIsEditingDays(!isEditingDays)}
          >
            {" "}
            {/* Toggle between Edit and */}
            {isEditingDays ? (
              <Text style={styles.editDaysButtonText}>Done</Text>
            ) : (
              <IconSymbol
                size={20}
                name={isEditingDays ? "checkmark" : "pencil"}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>

        {isEditingDays ? (
          <View style={styles.daysEditorContainer}>
            <TouchableOpacity
              style={styles.daysEditorButton}
              onPress={() => setNumberOfDays(Math.max(1, numberOfDays - 1))}
            >
              <Text style={styles.daysEditorButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.daysCountText}>{numberOfDays} Days</Text>
            <TouchableOpacity
              style={styles.daysEditorButton}
              onPress={() => setNumberOfDays(numberOfDays + 1)}
            >
              <Text style={styles.daysEditorButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(
              (day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.tab,
                    activeDay === day ? styles.activeTab : styles.inactiveTab,
                  ]}
                  onPress={() => setActiveDay(day)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeDay === day
                        ? styles.activeTabText
                        : styles.inactiveTabText,
                    ]}
                  >
                    Day {day}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchBar}
            placeholder="Search for places"
            placeholderTextColor={theme.subText}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => selectPlace(item)}
                >
                  <Text style={styles.suggestionMainText}>{item.name}</Text>
                  <Text style={styles.suggestionSecondaryText}>
                    {item.formatted_address}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          onPress={handleMapPress}
          mapType="standard"
        >
          {selectedPlaces.map((place) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.coordinates[1],
                longitude: place.coordinates[0],
              }}
              title={place.name}
              description={place.description}
            />
          ))}

          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.geometry.location.lat,
                longitude: selectedPlace.geometry.location.lng,
              }}
              title={selectedPlace.name}
              description="Tap to add to itinerary"
              pinColor="red"
            />
          )}
        </MapView>
      </View>

      {/* Selected Places List */}
      <View style={styles.selectedPlacesContainer}>
        <View style={styles.selectedPlacesHeader}>
          <Text style={styles.selectedPlacesTitle}>Selected Places List</Text>
          {selectedPlace && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPlaceToItinerary}
            >
              <Text style={styles.addButtonText}>+ Add Selected Place</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedPlaces.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No places selected yet</Text>
              <Text style={styles.emptyStateSubText}>
                Search and select places to add to your itinerary
              </Text>
            </View>
          ) : (
            Array.from({ length: numberOfDays }, (_, i) => i + 1).map((day) => (
              <View
                key={day}
                style={[
                  styles.dayContainer,
                  { backgroundColor: day % 2 === 0 ? "#E3F2FD" : "#FFF8E1" },
                ]}
              >
                <Text style={styles.dayTitle}>Day {day}</Text>
                {(organizedPlaces[day] || []).map((place) => (
                  <View key={place.id} style={styles.placeCard}>
                    <View style={styles.placeImageContainer}>
                      {place.image ? (
                        <Image
                          source={{ uri: place.image }}
                          style={styles.placeImage}
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Text style={styles.placeholderText}>📍</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      <Text style={styles.placeDescription}>
                        {place.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => removePlaceFromItinerary(place.id)}
                    >
                      <Text style={styles.menuIcon}>⋮</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

type ThemeType = typeof themes.light | typeof themes.dark;

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
    tabContainer: {
      backgroundColor: theme.headerBackground,
      paddingTop: 50,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabHeaderContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    tabHeaderText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
    },
    editDaysButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
      backgroundColor: theme.tabActiveBackground,
    },
    editDaysButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    daysEditorContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    daysEditorButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.tabActiveBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    daysEditorButtonText: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "bold",
    },
    daysCountText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginHorizontal: 20,
    },
    tabScrollContent: {
      paddingHorizontal: 15,
    },
    tab: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      marginRight: 10,
      borderRadius: 20,
      minWidth: 60,
      alignItems: "center",
    },
    activeTab: {
      backgroundColor: theme.tabActiveBackground,
    },
    inactiveTab: {
      backgroundColor: theme.tabInactiveBackground,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
    },
    activeTabText: {
      color: theme.tabActiveText,
    },
    inactiveTabText: {
      color: theme.tabInactiveText,
    },
    searchContainer: {
      paddingHorizontal: 15,
      paddingVertical: 15,
      backgroundColor: theme.headerBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchIcon: {
      fontSize: 16,
      marginRight: 10,
      color: theme.subText,
    },
    searchBar: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    loadingContainer: {
      backgroundColor: theme.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 5,
      borderRadius: 8,
    },
    loadingText: {
      fontSize: 14,
      color: theme.subText,
      fontStyle: "italic",
    },
    suggestionsContainer: {
      backgroundColor: theme.cardBackground,
      marginTop: 5,
      borderRadius: 8,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: theme.border,
    },
    suggestionItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    suggestionMainText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    suggestionSecondaryText: {
      fontSize: 14,
      color: theme.subText,
      marginTop: 2,
    },
    mapContainer: {
      flex: 1,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    selectedPlacesContainer: {
      backgroundColor: theme.background,
      maxHeight: 300,
      paddingHorizontal: 15,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    selectedPlacesTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 15,
    },
    placeCard: {
      flexDirection: "row",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    placeImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 8,
      overflow: "hidden",
      marginRight: 12,
    },
    placeImage: {
      width: "100%",
      height: "100%",
    },
    placeholderImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },
    placeholderText: {
      fontSize: 24,
    },
    placeInfo: {
      flex: 1,
      marginRight: 8,
    },
    placeName: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 4,
      flex: 1,
      marginRight: 8,
    },
    placeDescription: {
      fontSize: 14,
      color: theme.subText,
    },
    menuButton: {
      padding: 8,
    },
    menuIcon: {
      fontSize: 16,
      color: theme.subText,
    },
    addButton: {
      backgroundColor: theme.tabActiveBackground,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
    },
    addButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    selectedPlacesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    placeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
      flexWrap: "nowrap",
    },
    placeDay: {
      fontSize: 12,
      color: theme.tabActiveBackground,
      fontWeight: "600",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: `${theme.tabActiveBackground}20`,
      marginLeft: 8,
      flexShrink: 0,
    },
    dayContainer: {
      marginBottom: 12,
      borderRadius: 12,
      overflow: "hidden",
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    dayTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.1)",
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 8,
    },
    emptyStateSubText: {
      fontSize: 14,
      color: theme.subText,
      textAlign: "center",
    },
  });
