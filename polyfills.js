// Simple polyfills - MUST BE FIRST
import 'react-native-url-polyfill/auto';

// Buffer polyfill
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Process polyfill
global.process = require('process');

// UUID polyfill
import 'react-native-get-random-values';

console.log('Simple polyfills loaded');
