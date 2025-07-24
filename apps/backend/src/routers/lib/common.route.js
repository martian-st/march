import { Router } from "express";

// Journal related imports
import {
    createUpdateJournalController,
    getUserTodayJournalController,
    getUserAllJournalsController,
    getUserJournalByDateController
} from "../../controllers/lib/journal.controller.js";

// User and item management imports
import {
    getInboxObjectsController,
    getObjectsWithDateController,
    reorderObjectsController,
    getInboxObjectController,
    updateInboxObjectController,
    deleteInboxObjectController,
    getUserTodayObjectsController,
    getUserOverdueObjectsController,
    moveObjecttoDateController,
    getUserObjectsByDateController,
    getAllObjectsController
} from "../../controllers/core/user.controller.js";

// Item functionality imports
import {
    createInboxObjectController,
    getSubObjectsController,
    getThisWeekObjectsByDateRangeController,
    getUserFavoriteObjectsController,
    getObjectsByTypeAndSourceController,
    searchObjectsByTitleController,
    filterObjectsController,
    getObjectsBySourceController,
    getUserUpcomingObjectsController,
    getObjectsByRecurrenceController
} from "../../controllers/lib/object.controller.js";
// Utility imports
import { uploadFileController } from "../../controllers/lib/fileAsset.controller.js";
import { upload } from "../../loaders/s3.loader.js";
import { feedbackController } from "../../controllers/lib/feedback.controller.js";
import { linkPreviewGeneratorController } from "../../controllers/lib/linkPreview.controller.js";
import { createTypeController, getAllTypesController, getTypesBySlugController } from "../../controllers/lib/type.controller.js";

const router = Router();

/* Inbox Management Routes
-------------------------------------------------- */
router.route("/inbox/")
    .get(getInboxObjectsController)
    .post(createInboxObjectController);

router.route("/reorder/").put(reorderObjectsController)

router.route("/objects/without-date/").get(getInboxObjectsController);
router.route("/objects/with-date/").get(getObjectsWithDateController);
router.route("/objects/source/").get(getObjectsBySourceController);

router.route("/inbox/:object/")
    .get(getInboxObjectController)
    .put(updateInboxObjectController)
    .delete(deleteInboxObjectController);

router.route("/inbox/:item/sub-items/").get(getSubObjectsController);

/* Timeline Routes
-------------------------------------------------- */
router.route("/this-week/").get(getThisWeekObjectsByDateRangeController);
router.route("/today/").get(getUserTodayObjectsController);
router.route("/overdue/").get(getUserOverdueObjectsController);
router.route("/favorite/").get(getUserFavoriteObjectsController);
router.route("/setDate/").post(moveObjecttoDateController);
router.route("/items/").get(getObjectsByTypeAndSourceController);
router.route("/upcoming/").get(getUserUpcomingObjectsController);
router.route("/recurrence/").get(getObjectsByRecurrenceController);

/* Journal Routes
-------------------------------------------------- */
router.route("/journals/create-update/").post(createUpdateJournalController);
router.route("/journals/today/").get(getUserTodayJournalController);
router.route("/journals/overview/").get(getUserAllJournalsController);
router.route("/journals/:date/").get(getUserJournalByDateController);

/* Item Management Routes
-------------------------------------------------- */
router.route("/items/").get(getAllObjectsController);
router.route("/items/search/").get(searchObjectsByTitleController);
router.route("/items/filter/").get(filterObjectsController);
// router.route("/items/source/").get(getObjectsBySourceController);
router.route("/items/all/").get(getAllObjectsController);

/* Asset Management Routes
-------------------------------------------------- */
router.route("/file-assets/upload/")
    .post(upload.single("file"), uploadFileController);

/* Utility Routes
-------------------------------------------------- */
router.route("/feedback/").post(feedbackController);
router.route("/get-link-preview/").post(linkPreviewGeneratorController);

/* Types Routes
-------------------------------------------------- */
router.route("/types/")
    .post(createTypeController)
    .get(getAllTypesController);

router.route("/types/:slug").get(getTypesBySlugController);

/* Dynamic Date Route */
router.route("/:date/").get(getUserObjectsByDateController);

export default router;
