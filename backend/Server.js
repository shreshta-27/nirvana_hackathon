import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected Successfully!`);
        console.log(`📍 Host: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};
connectDB();

app.get('/', (req, res) => {
    res.json({
        message: 'Server is running!',
        status: 'success',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// AI Chatbot Test Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log(`🤖 Received message: ${message}`);

        // Generate response using Gemini
        const result = await model.generateContent(message);
        const response = await result.response;
        const aiResponse = response.text();

        console.log(`✅ AI Response generated successfully`);

        res.json({
            success: true,
            userMessage: message,
            aiResponse: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ AI Chat Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI response',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB');



});
