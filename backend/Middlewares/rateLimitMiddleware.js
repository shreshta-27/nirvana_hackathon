import rateLimit from 'express-rate-limit';

export const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many authentication requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'AI request limit exceeded. Please wait a moment.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const chartLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Chart generation limit exceeded. Please wait a moment.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Upload limit exceeded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const createCustomLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: message || 'Rate limit exceeded.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

export const applyRateLimit = (type) => {
    const limiters = {
        strictAuth: strictAuthLimiter,
        auth: authLimiter,
        general: generalLimiter,
        ai: aiLimiter,
        chart: chartLimiter,
        upload: uploadLimiter,
        emailOtp: authLimiter
    };

    return limiters[type] || generalLimiter;
};
