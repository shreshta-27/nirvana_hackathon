import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const testGeminiAPI = async () => {
    try {
        console.log('🧪 Testing Gemini API Configuration...\n');
        console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '***configured***' : '❌ NOT SET');

        if (!process.env.GEMINI_API_KEY) {
            console.error('\n❌ GEMINI_API_KEY is not set in .env file!');
            process.exit(1);
        }

        console.log('\n📡 Initializing Gemini AI...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log('✅ Gemini AI initialized successfully');
        console.log('\n🤖 Sending test prompt to Gemini...');

        const prompt = "Hello! Please respond with 'Gemini API is working!' if you can read this message.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('\n✅ GEMINI API IS WORKING!\n');
        console.log('📝 Response from Gemini:');
        console.log('─'.repeat(50));
        console.log(text);
        console.log('─'.repeat(50));

        console.log('\n🎉 Test completed successfully!');
        console.log('✅ Gemini API is properly configured and responding');

    } catch (error) {
        console.error('\n❌ GEMINI API TEST FAILED!');
        console.error('Error:', error.message);

        if (error.message.includes('API_KEY_INVALID')) {
            console.error('\n💡 The API key appears to be invalid.');
            console.error('Please check your GEMINI_API_KEY in the .env file.');
        } else if (error.message.includes('quota')) {
            console.error('\n💡 API quota may have been exceeded.');
        }

        console.error('\nFull error:', error);
        process.exit(1);
    }
};

testGeminiAPI();
