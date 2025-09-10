// Test for Android Maps SDK integration
const MAPS_API_KEY = 'AIzaSyCOziqmbH6fgeqEnfCXKG4wleJWKIutY3s'; // This should match the key in AndroidManifest.xml

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

// Run the test
testMapsSDKConfiguration();