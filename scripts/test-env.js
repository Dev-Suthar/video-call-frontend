#!/usr/bin/env node

// Test script to verify environment variables
require('dotenv').config({ path: '.env' });

console.log('🔍 Testing Environment Variables:');
console.log('SOCKET_SERVER_URL:', process.env.SOCKET_SERVER_URL);
console.log('WEBRTC_STUN_SERVERS:', process.env.WEBRTC_STUN_SERVERS);
console.log('DEBUG:', process.env.DEBUG);
console.log('ENVIRONMENT:', process.env.ENVIRONMENT);

// Test if the .env file is being read
const fs = require('fs');
if (fs.existsSync('.env')) {
    console.log('✅ .env file exists');
    const envContent = fs.readFileSync('.env', 'utf8');
    const socketUrlLine = envContent.split('\n').find(line => line.startsWith('SOCKET_SERVER_URL='));
    console.log('📄 SOCKET_SERVER_URL from .env file:', socketUrlLine);
} else {
    console.log('❌ .env file does not exist');
} 