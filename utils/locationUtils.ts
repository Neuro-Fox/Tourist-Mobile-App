const MAPS_API_KEY = "AIzaSyAKt8tWZ5XiFM3hYlk6PQfoHAh7vg4VvdA";

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

// Function to search for places by query
export async function searchPlaces(query: string) {
  try {
    const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    const params = new URLSearchParams({
      query: query,
      key: MAPS_API_KEY,
    });

    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Place search failed: ${data.status}`);
    }

    // Process and enhance each result with a photo URL if available
    const places: PlaceSearchResult[] = await Promise.all(
      data.results.map(async (result: PlaceSearchResult) => {
        let photoUrl = null;
        if (result.photos && result.photos.length > 0) {
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${MAPS_API_KEY}`;
        }
        return {
          ...result,
          photo_url: photoUrl,
        };
      })
    );

    return places;
  } catch (error) {
    console.error("Error searching places:", error);
    throw error;
  }
}

// Function to get place information and image from coordinates
export async function getPlaceInfo(latitude: number, longitude: number) {
  const MAPS_API_KEY = "AIzaSyAKt8tWZ5XiFM3hYlk6PQfoHAh7vg4VvdA";

  try {
    // First, get place information using reverse geocoding
    const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${MAPS_API_KEY}`;
    const geocodeResponse = await fetch(reverseGeocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK" || !geocodeData.results[0]) {
      throw new Error("No place found at these coordinates");
    }

    const placeId = geocodeData.results[0].place_id;
    const placeName = geocodeData.results[0].formatted_address;

    // Then, get place details including photos
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${MAPS_API_KEY}`;
    const detailsResponse = await fetch(placeDetailsUrl);
    const detailsData = await detailsResponse.json();

    let photoUrl = null;
    if (detailsData.result?.photos && detailsData.result.photos.length > 0) {
      const photoReference = detailsData.result.photos[0].photo_reference;
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${MAPS_API_KEY}`;
    }

    return {
      name: placeName,
      photoUrl: photoUrl,
    };
  } catch (error) {
    console.error("Error getting place information:", error);
    throw error;
  }
}
