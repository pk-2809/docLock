# Backend Cookie & CSRF Configuration Guide

## Overview
This document provides the exact backend configuration needed to support Safari and ensure secure cross-origin authentication.

## Required Changes

### 1. Update Cookie Configuration

Add this helper function to your backend:

```javascript
// ============================================
// Environment-aware Cookie Configuration
// ============================================
function getCookieConfig(req) {
  const isLocalhost = req.headers.origin?.includes('localhost');
  
  return {
    httpOnly: true,
    sameSite: isLocalhost ? 'lax' : 'none',  // lax for localhost, none for prod
    secure: !isLocalhost,                     // false for localhost, true for prod
    domain: isLocalhost ? 'localhost' : undefined,
    maxAge: isLocalhost 
      ? 24 * 60 * 60 * 1000           // 24 hours for development
      : 5 * 24 * 60 * 60 * 1000       // 5 days for production
  };
}
```

### 2. Update CORS Configuration

```javascript
const allowedOrigins = [
  'http://localhost:4200',        // Local frontend
  'http://localhost:3000',        // Local testing
  'https://docklock.web.app',     // Production
  'https://doclock-96a20.web.app' // Firebase default
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 3. Add CSRF Token Generation (Production Only)

```javascript
const crypto = require('crypto');

function generateCsrfToken(req, res) {
  const isLocalhost = req.headers.origin?.includes('localhost');
  
  if (!isLocalhost) {
    // Generate CSRF token for production
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false,  // Frontend needs to read this
      sameSite: 'none',
      secure: true,
      maxAge: 5 * 24 * 60 * 60 * 1000  // 5 days
    });
    return csrfToken;
  }
  return null;
}
```

### 4. Add CSRF Validation Middleware

```javascript
app.use((req, res, next) => {
  const isLocalhost = req.headers.origin?.includes('localhost');
  
  // Skip CSRF check for localhost or safe methods
  if (isLocalhost || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for login/signup endpoints (CSRF token doesn't exist yet)
  if (['/api/login', '/api/signup', '/api/login-verify', '/api/check-user'].includes(req.path)) {
    return next();
  }
  
  // Validate CSRF for production state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromCookie = req.cookies['csrf-token'];
    
    if (!tokenFromHeader || tokenFromHeader !== tokenFromCookie) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  
  next();
});
```

### 5. Update Login/Signup Endpoints

```javascript
// Example: Login verification endpoint
app.post('/api/login-verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Create session token
    const sessionToken = createSessionToken(decodedToken);
    
    // Set session cookie (environment-aware)
    const cookieConfig = getCookieConfig(req);
    res.cookie('session', sessionToken, cookieConfig);
    
    // Generate CSRF token for production
    generateCsrfToken(req, res);
    
    res.json({ status: 'success', uid: decodedToken.uid });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Apply same pattern to signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { name, idToken, key } = req.body;
    
    // Verify and create user...
    
    // Set cookies
    const cookieConfig = getCookieConfig(req);
    res.cookie('session', sessionToken, cookieConfig);
    generateCsrfToken(req, res);
    
    res.json({ status: 'success', uid: user.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Security Summary

✅ **Localhost (Development)**:
- sameSite: 'lax' - Works in Safari
- secure: false - Works with HTTP
- domain: 'localhost' - Safari compatible
- No CSRF - Easier development
- 24-hour sessions

✅ **Production**:
- sameSite: 'none' - Cross-origin support
- secure: true - HTTPS only
- CSRF protection - Prevents attacks
- 5-day sessions
- Auto-detected based on request origin

## Testing

1. **Localhost (Safari)**: Should now work without cookie blocking
2. **Production (Safari)**: Should work with CSRF protection
3. **All browsers**: Full compatibility

## Files to Update

In your backend project:
1. Main server file (app.js or server.js)
2. Login route handler
3. Signup route handler
4. Any other routes that set cookies

Frontend changes are already complete ✅
