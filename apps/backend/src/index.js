import express from "express";
import cors from "cors";
import Joi from "joi";
import { environment } from "./loaders/environment.loader.js";
import { initRoutes } from "./routers/index.js";
import { handlePushNotification } from "./controllers/integration/email.controller.js";
import { handleWebhook } from "./controllers/integration/linear.controller.js";
import { handleGithubWebhook } from "./controllers/integration/github.controller.js";
import { handleSmsItemCreation } from "./controllers/integration/message.controller.js";
import bodyParser from "body-parser";
import { linearWorker } from "./jobs/linear.job.js"
import { initWorker } from "./jobs/init.job.js";
import { XWorker } from "./jobs/x.job.js";

const { ValidationError } = Joi;
const app = express();
// Configure CORS to allow requests from your frontend domains
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'https://app.march.cat',
            'https://march.cat'
        ];

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'sec-websocket-protocol']
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests before any middleware
app.options('*', cors(corsOptions));

app.use('/linear/webhook', bodyParser.raw({ type: 'application/json' }));

app.use(express.json());
app.use(
    express.urlencoded({
        extended: true
    })
);

app.post("/linear/webhook", handleWebhook);
app.post("/gmail/webhook", handlePushNotification);
app.post("/github/webhook", handleGithubWebhook);

app.post("/sms", handleSmsItemCreation);

initRoutes(app);
// Express error handler
app.use((err, req, res, next) => {
    console.log(err);
    if (environment.SHOW_ADMIN) {
        console.log(err);
    }
    if (err) {
        if (err.statusCode === 500) {
            // sentry.captureException(err)
        }
        res
            .status(err instanceof ValidationError ? 400 : err.statusCode || 500)
            .send({
                statusCode:
          err instanceof ValidationError ? 400 : err.statusCode || 500,
                message:
          process.env.NODE_ENV === "development"
              ? err.message
              : "Something went wrong. Please contact the administrator"
            });
    } else {
        next();
    }
});

export { app, express };
