import AuthRouter from "./core/auth.route.js";
import UserRouter from "./core/user.route.js";
import { JWTMiddleware } from "../middlewares/jwt.middleware.js";
import ArrayRouter from "../routers/lib/array.route.js";
import CommonRouter from "../routers/lib/common.route.js";
import LinearRoute from "../routers/integration/linear.route.js";
import CalenderRoute from "../routers/integration/calendar.route.js";
import EmailRoute from "../routers/integration/email.route.js";
import GithubRoute from "../routers/integration/github.route.js";
import NotionRoute from "../routers/integration/notion.route.js";
import XRoute from "../routers/integration/x.route.js";
import AiRoute from "../routers/ai/enhanced-ai.route.js";
import { intelligentAIRouter } from "../routers/ai/intelligent-ai.route.js";

/**
 * @param {import('express').Application} app
 */

const initRoutes = (app) => {
    app.use("/auth", AuthRouter);
    app.use("/users", JWTMiddleware, UserRouter);
    app.use("/arrays", JWTMiddleware, ArrayRouter);
    app.use("/api", JWTMiddleware, CommonRouter);
    app.use('/linear', JWTMiddleware, LinearRoute);
    app.use('/calendar', JWTMiddleware, CalenderRoute);
    app.use('/gmail', JWTMiddleware, EmailRoute);
    app.use('/github', JWTMiddleware, GithubRoute);
    app.use('/notion', JWTMiddleware, NotionRoute);
    app.use('/x', JWTMiddleware, XRoute);
    app.use('/ai/enhanced', JWTMiddleware, AiRoute);
    app.use('/ai/intelligent', JWTMiddleware, intelligentAIRouter);
    app.get("/", async (req, res) => {
        res.json({
            "message": "Welcome to  sage "
        })
    })

    app.use("*", (req, res) => {
        res.status(404).json({
            "status": 404,
            "message": "Invalid route"
        })
    })
}

export {
    initRoutes
}
