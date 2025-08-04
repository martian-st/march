import { Router } from "express";
import { handleGithubCallbackController, uninstallGithubAppController } from "../../controllers/integration/github.controller.js";


const router = Router();

router.get('/callback', handleGithubCallbackController);
router.route("/revoke-access/").delete(uninstallGithubAppController)

export default router;
