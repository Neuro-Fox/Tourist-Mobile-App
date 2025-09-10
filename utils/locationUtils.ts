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
