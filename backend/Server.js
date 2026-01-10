import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import authRoutes from './Routers/authRoutes.js';
import emailOtpRoutes from './Routers/emailOtpRoutes.js';
import patientRoutes from './Routers/patientRoutes.js';
import visitRoutes from './Routers/visitRoutes.js';
import doctorRoutes from './Routers/doctorRoutes.js';
import workerRoutes from './Routers/workerRoutes.js';
import alertRoutes from './Routers/alertRoutes.js';
import chartRoutes from './Routers/chartRoutes.js';
import publicRoutes from './Routers/publicRoutes.js';

import { errorHandler, notFound } from './Middlewares/errorMiddleware.js';
import {
    strictAuthLimiter,
    authLimiter,
    generalLimiter,
    aiLimiter,
    chartLimiter
} from './Middlewares/rateLimitMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.set('trust proxy', 1);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000
        });

        console.log(`✅ MongoDB Connected Successfully!`);
        console.log(`📍 Host: ${mongoose.connection.host}`);
        console.log(`📦 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Nirvana Backend API',
        version: '1.0.0',
        status: 'running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        endpoints: {
            auth: '/api/auth',
            emailOtp: '/api/email-otp',
            patients: '/api/patients',
            visits: '/api/visits',
            doctor: '/api/doctor',
            worker: '/api/worker',
            alerts: '/api/alerts',
            charts: '/api/charts'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage()
    });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/email-otp', authLimiter, emailOtpRoutes);
app.use('/api/patients', generalLimiter, patientRoutes);
app.use('/api/visits', aiLimiter, visitRoutes);
app.use('/api/doctor', generalLimiter, doctorRoutes);
app.use('/api/worker', generalLimiter, workerRoutes);
app.use('/api/public', generalLimiter, publicRoutes);
app.use('/api/alerts', generalLimiter, alertRoutes);
app.use('/api/charts', chartLimiter, chartRoutes);

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

process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

const server = app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Nirvana Backend Server Started`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`${'='.repeat(50)}\n`);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

export default app;

