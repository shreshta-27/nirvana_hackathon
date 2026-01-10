import jwt from 'jsonwebtoken';
import User from '../Models/userSchema.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive.'
            });
        }

        req.user = {
            userId: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role,
            name: user.name
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }

        res.status(401).json({
            success: false,
            error: 'Invalid token.'
        });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = {
                    userId: user._id,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    name: user.name
                };
            }
        }

        next();
    } catch (error) {
        next();
    }
};
