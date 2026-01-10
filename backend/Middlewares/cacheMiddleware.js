import NodeCache from 'node-cache';

const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

export const cacheMiddleware = (duration = 300) => {
    return (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `${req.originalUrl || req.url}_${req.user?.userId || 'guest'}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            return res.json(cachedResponse);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200 && body.success) {
                cache.set(key, body, duration);
            }
            return originalJson(body);
        };

        next();
    };
};

export const clearCache = (pattern) => {
    if (pattern) {
        const keys = cache.keys();
        keys.forEach(key => {
            if (key.includes(pattern)) {
                cache.del(key);
            }
        });
    } else {
        cache.flushAll();
    }
};

export const invalidateUserCache = (userId) => {
    const keys = cache.keys();
    keys.forEach(key => {
        if (key.includes(userId)) {
            cache.del(key);
        }
    });
};

export default cache;
