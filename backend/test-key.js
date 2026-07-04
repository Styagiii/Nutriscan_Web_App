const path = require('path');
const dotenvPath = path.join(__dirname, '.env');
require('dotenv').config({ path: dotenvPath });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = (process.env.GEMINI_API_KEY || '').trim();

console.log('--- NutriScan Gemini API Key Checker ---');
console.log('Checking .env file path:', dotenvPath);

const fs = require('fs');
if (!fs.existsSync(dotenvPath)) {
  console.log('❌ Error: backend/.env file does not exist.');
  console.log('👉 Please rename backend/.env.example to backend/.env and put your Gemini API key in it.');
  process.exit(1);
}

if (!key) {
  console.log('❌ Error: GEMINI_API_KEY is empty or not set in backend/.env.');
  process.exit(1);
}

console.log('Found GEMINI_API_KEY: ' + key.substring(0, 6) + '...' + key.substring(Math.max(6, key.length - 4)));
console.log('Attempting to contact Gemini API...');

const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function test() {
  try {
    const result = await model.generateContent('Say "API Key is working!"');
    console.log('\n🟢 Success! Gemini API responded:');
    console.log('"' + result.response.text().trim() + '"');
  } catch (error) {
    console.log('\n❌ API Call Failed!');
    console.error(error.message || error);
  }
}

test();
