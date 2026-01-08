// MUST BE FIRST: Catch startup errors
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception during startup:', err);
    console.error(err.stack);
    // Keep alive briefly to allow flushing logs? No, Cloud Run logs capture stdout/err.
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

console.log(`[Startup] Environment: ${process.env.NODE_ENV}`);
console.log(`[Startup] Attempting to listen on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Startup] Server is successfully running on port ${PORT}`);
});

server.on('error', (err: any) => {
    console.error('[Startup] Server listen error:', err);
    process.exit(1);
});
