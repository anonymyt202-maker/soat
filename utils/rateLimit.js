const config = require('../config');

const store = new Map();

function rateLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  
  if (!store.has(key)) {
    store.set(key, { count: 1, resetAt: now + config.rateLimit.windowMs });
    return false;
  }
  
  const entry = store.get(key);
  
  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.rateLimit.windowMs });
    return false;
  }
  
  entry.count++;
  if (entry.count > config.rateLimit.max) return true;
  
  return false;
}

function rateLimitMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    
    if (rateLimit(userId)) {
      try {
        await ctx.reply('⚠️ Juda tez bosyapsiz! Biroz kuting...');
      } catch (e) {}
      return;
    }
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = { rateLimit, rateLimitMiddleware };
