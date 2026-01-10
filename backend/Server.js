import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import authRoutes from './Routers/authRoutes.js';
import patientRoutes from './Routers/patientRoutes.js';
import visitRoutes from './Routers/visitRoutes.js';
import doctorRoutes from './Routers/doctorRoutes.js';
import alertRoutes from './Routers/alertRoutes.js';

import { errorHandler, notFound } from './Middlewares/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'AI request limit exceeded, please wait a moment.'
    }
});

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
        success: true,
        message: 'Nivarna Backend API',
        version: '1.0.0',
        status: 'running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        endpoints: {
            auth: '/api/auth',
            patients: '/api/patients',
            visits: '/api/visits',
            doctor: '/api/doctor',
            alerts: '/api/alerts'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patients', generalLimiter, patientRoutes);
app.use('/api/visits', aiLimiter, visitRoutes);
app.use('/api/doctor', generalLimiter, doctorRoutes);
app.use('/api/alerts', generalLimiter, alertRoutes);

app.use(notFound);
app.use(errorHandler);

mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('📴 Mongoose disconnected from MongoDB');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Nivarna Backend Server Started`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`${'='.repeat(50)}\n`);
});

export default app;
