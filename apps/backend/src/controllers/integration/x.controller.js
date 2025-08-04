import { TwitterApi } from "twitter-api-v2";
import { XQueue } from "../../loaders/bullmq.loader.js";
import { environment } from "../../loaders/environment.loader.js";

const twitterClient = new TwitterApi({
    clientId: environment.X_CLIENT_ID,
    clientSecret: environment.X_CLIENT_SECRET
});


const CALLBACK_URL = environment.X_CALLBACK_URL;


export const redirectXOAuthLoginController = async (req, res) => {
    try {
        const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
            CALLBACK_URL,
            {
                scope: ["tweet.read", "users.read", "bookmark.read", "offline.access"]
            }
        );

        res.json({
            url,
            state,
            codeVerifier
        });
    } catch (error) {
        console.error("Twitter OAuth Error:", error);
        res.status(500).json({
            message: "Error initiating Twitter OAuth",
            error: error.message
        });
    }
};

export const getXAccessTokenController = async (req, res) => {
    try {
        const { code, codeVerifier } = req.query;
        const user = req.user;

        if (!code || !codeVerifier) {
            throw new Error(
                `Missing required parameters: ${!code ? "code" : "codeVerifier"}`
            );
        }

        const {
            client: loggedClient,
            accessToken,
            refreshToken
        } = await twitterClient.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: CALLBACK_URL
        });
        user.integration.x.accessToken = accessToken;
        user.integration.x.refreshToken = refreshToken;
        user.integration.x.connected = true;
        await user.save();

        await XQueue.add("XQueue", {
            accessToken,
            userId: user._id
        });

        res.json({
            message: "Twitter authentication successful",
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error("Error exchanging Twitter OAuth token:", error);
        res.status(500).json({
            message: "Error getting access token",
            error: error.message
        });
    }
};
