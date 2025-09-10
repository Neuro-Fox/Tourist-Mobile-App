// Simple polyfills - MUST BE FIRST
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Buffer polyfill
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Process polyfill
global.process = require('process');

console.log('Simple polyfills loaded');
