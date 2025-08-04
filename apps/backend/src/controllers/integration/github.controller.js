import { environment } from "../../loaders/environment.loader.js";
import { processWebhookEvent, exchangeCodeForAccessToken, uninstallGithubApp } from "../../services/integration/github.service.js";
import * as crypto from "crypto";
import { Source } from "../../models/lib/source.model.js";

const handleGithubCallbackController = async (req, res, next) => {
    try {
        const { installation_id: installationId, code } = req.query;
        const user = req.user;
        
        if (!installationId || !code) {
            return res.status(400).json({
                message: 'Missing required parameters'
            });
        }
        
        const profile = await exchangeCodeForAccessToken(code);

        user.integration.github.installationId = installationId;
        user.integration.github.userName = profile.login;
        user.integration.github.connected = true;
        await user.save();

        if (user.integration.github.connected) {
            const existingSource = await Source.findOne({ slug: "github", user: user._id });
            if (!existingSource) {
                const source = new Source({
                    slug: "github",
                    user: user._id
                });
                await source.save();
            }
        }

        res.status(200).json({
            message: 'GitHub App installed and user authenticated successfully'
        });
    } catch (err) {
        console.error('GitHub callback error:', err);
        next(err);
    }
};

const verifyGithubSignature = (req) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const GITHUB_WEBHOOK_SECRET = environment.GITHUB_WEBHOOK_SECRET

    if (!signature || !payload || !GITHUB_WEBHOOK_SECRET) {
        return false;
    }

    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

const handleGithubWebhook = async (req, res, next) => {
    try {
        if (!verifyGithubSignature(req)) {
            return res.status(401).send({ message: 'Invalid signature' });
        }

        const event = req.headers['x-github-event'];
        const payload = req.body;

        await processWebhookEvent(event, payload);

        res.status(200).send({ message: 'Webhook received and processed' });
    } catch (err) {
        next(err);
    }
};

const uninstallGithubAppController = async (req, res, next) => {
    const user = req.user;
    try {
        await uninstallGithubApp(user);

        res.status(200).json({
            message: 'Github App uninstall successfully.'
        });
    } catch (err) {
        console.error('Error uninstalling Github App:', err);
        next(err);
    }
};

export {
    handleGithubCallbackController,
    handleGithubWebhook,
    uninstallGithubAppController
};
