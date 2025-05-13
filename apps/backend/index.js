import { app } from "./src/index.js";
import { environment } from "./src/loaders/environment.loader.js";
import { createServer } from "http";
import { initializeWebSocket } from "./src/loaders/websocket.loader.js";

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Keep the process running despite the error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Keep the process running despite the rejection
});

let server;

async function init() {
    try {
        server = createServer(app);
        
        // Add error handler for server
        server.on('error', (error) => {
            console.error('Server error:', error);
        });

        await new Promise((resolve) => {
            server.listen(environment.PORT, '0.0.0.0', () => {
                console.log(`Server listening on port ${environment.PORT} on all interfaces`);
                resolve();
            });
        });

        await initializeWebSocket(server);

        // Add health check endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'healthy' });
        });

    } catch (error) {
        console.error('Failed to initialize server:', error);
        // Keep the process running despite initialization errors
    }
}

// Graceful shutdown
function shutdown() {
    console.log('Received shutdown signal');
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });

        // Force close after 10s
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

init();

// for webhook testing
// import { app } from "./src/index.js";
// import { environment } from "./src/loaders/environment.loader.js";
// import { createServer } from "http";
// import { initializeWebSocket } from "./src/loaders/websocket.loader.js"; // Ensure the path is correct
// import ngrok from '@ngrok/ngrok';

// let listener;

// (async function init () {
//     const server = createServer(app);
//     server.listen(environment.PORT, '0.0.0.0', async () => {
//         console.log(`Server listening on port ${environment.PORT} on all interfaces`);
//         // Await ngrok forwarding outside the listen callback
//         listener = await ngrok.forward({ addr: `http://localhost:${environment.PORT}`, authtoken: environment.NGROK_AUTH_TOKEN });
//         console.log(`Ingress established at: ${listener.url()}`);
//     });

//     initializeWebSocket(server);
// })();
