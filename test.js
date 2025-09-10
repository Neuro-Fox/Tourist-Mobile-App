// Test for Android Maps SDK integration
const MAPS_API_KEY = 'AIzaSyAKt8tWZ5XiFM3hYlk6PQfoHAh7vg4VvdA'; // This should match the key in AndroidManifest.xml

// Function to test if the Maps API key is properly configured
async function testMapsSDKConfiguration() {
    try {
        // Test geocoding API as a proxy to verify API key works
        const testLocation = 'New York, NY';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testLocation)}&key=${MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            console.log('✅ Maps SDK API key is valid and working!');
            console.log('Test location coordinates:');
            console.log('Latitude:', data.results[0].geometry.location.lat);
            console.log('Longitude:', data.results[0].geometry.location.lng);

            // Additional check specific to Android SDK
            console.log('\nℹ️ Android SDK Configuration:');
            console.log('- Make sure the API key is properly set in AndroidManifest.xml');
            console.log('- Verify the following APIs are enabled in Google Cloud Console:');
            console.log('  • Maps SDK for Android');
            console.log('  • Places API');
            console.log('  • Geocoding API');
        } else {
            console.error('❌ Error with Maps SDK API key:', data.status);
            console.error('Error message:', data.error_message);
        }
    } catch (error) {
        console.error('❌ Error testing Maps SDK configuration:', error);
    }
}

// Function to get place information and image from coordinates
async function getPlaceInfo(latitude, longitude) {
    try {
        // First, get place information using reverse geocoding
        const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${MAPS_API_KEY}`;
        const geocodeResponse = await fetch(reverseGeocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
            throw new Error('No place found at these coordinates');
        }

        const placeId = geocodeData.results[0].place_id;
        const placeName = geocodeData.results[0].formatted_address;

        // Then, get place details including photos
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${MAPS_API_KEY}`;
        const detailsResponse = await fetch(placeDetailsUrl);
        const detailsData = await detailsResponse.json();

        let photoUrl = null;
        if (detailsData.result.photos && detailsData.result.photos.length > 0) {
            const photoReference = detailsData.result.photos[0].photo_reference;
            photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${MAPS_API_KEY}`;
        }

        return {
            name: placeName,
            photoUrl: photoUrl
        };
    } catch (error) {
        console.error('Error getting place information:', error);
        throw error;
    }
}

// Example usage and tests
async function runTests() {
    // Test Maps SDK configuration
    await testMapsSDKConfiguration();

    // Test getting place info (example coordinates for Times Square, NY)
    try {
        const placeInfo = await getPlaceInfo(40.7580, -73.9855);
        console.log('\n✅ Place Information:');
        console.log('Name:', placeInfo.name);
        console.log('Photo URL:', placeInfo.photoUrl);
    } catch (error) {
        console.error('❌ Error getting place info:', error);
    }
}

// Run the tests
runTests();