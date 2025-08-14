import { verifyJWTToken } from "../utils/jwt.service.js";
import { BlackList } from "../models/core/black-list.model.js";
import { getUserById } from "../services/core/user.service.js";

const JWTMiddleware = async (req, res, next) => {
    try {
        // Skip JWT validation for OPTIONS requests (CORS preflight)
        if (req.method === 'OPTIONS') {
            return next();
        }
        
        const { authorization: header } = req.headers;
        if (!header) {
            throw new Error("Unauthorized")
        }
        const token = header.split(' ')[1]
        const checkIfBlacklisted = await BlackList.findOne({ token });
        if (checkIfBlacklisted) {
            return res
                .status(401)
                .json({ message: "This token has expired. Please login" });
        }
        const payload = await verifyJWTToken(token);
        const user = await getUserById(payload.id)
        req.user = user;

        next();
    } catch (err) {
        const error = new Error(err.message);
        error.statusCode = 401;
        next(error);
    }
};

const AdminJWTMiddleware = async (req, res, next) => {
    try {
        const { authorization: header } = req.headers;
        if (!header) {
            throw new Error("Unauthorized")
        }
        const token = header.split(' ')[1]
        const payload = await verifyJWTToken(token);
        if (!payload.roles.includes("admin")) {
            const error = new Error("Unauthorized")
            throw error
        }
        req.user = payload;
        next();
    } catch (err) {
        const error = new Error(err.message);
        error.statusCode = 401;
        next(error);
    }
};

const checkUserVerificationController = async (req, res, next) => {
    try {
        const { authorization: header } = req.headers;

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authorization token missing or invalid", isValidUser: false });
        }

        const token = header.split(' ')[1];

        const checkIfBlacklisted = await BlackList.findOne({ token });
        if (checkIfBlacklisted) {
            return res.status(401).json({ isValidUser: false });
        }

        const payload = await verifyJWTToken(token);
        if (!payload) {
            return res.status(401).json({ isValidUser: false });
        }
        const user = await getUserById(payload.id)
        if (!user) {
            return res.status(401).json({ isValidUser: false });
        }
        return res.status(200).json({ isValidUser: true });
    } catch (err) {
        const error = new Error(err.message);
        error.statusCode = 401;
        next(error);
    }
};

export {
    JWTMiddleware,
    AdminJWTMiddleware,
    checkUserVerificationController
};
