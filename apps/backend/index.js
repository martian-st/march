import { app } from "./src/index.js";
import { environment } from "./src/loaders/environment.loader.js";
import { createServer } from "http";
import { initializeWebSocket } from "./src/loaders/websocket.loader.js";

(async function init() {
  const server = createServer(app);
  server.listen(environment.PORT, () => {
    console.log(`Server listening on port ${environment.PORT}`);
  });

  initializeWebSocket(server);
})();

// import { app } from "./src/index.js";
// import { environment } from "./src/loaders/environment.loader.js";
// import { createServer } from "http";
// import { voiceWebSocketService } from "./src/services/websocket/voice-websocket.service.js";

// (async function init () {
//     // Create HTTP server to support both Express and WebSocket
//     const server = createServer(app);

//     // Initialize WebSocket service
//     voiceWebSocketService.initialize(server);

//     server.listen(environment.PORT, () => {
//         console.log(`Server listening on port ${environment.PORT}`)
//         console.log(`WebSocket voice chat available at ws://localhost:${environment.PORT}/voice-chat`)
//     })
// })()
