import { createObject, createInboxObject, filterObjects, updateObject, getAllObjectsByBloack, getObject, getObjectFilterByLabel, searchObjectsByTitle, getThisWeekObjectsByDateRange, getUserFavoriteObjects, getSubObjects, getObjectsBySource, getObjectsByTypeAndSource, getUserUpcomingObjects, getObjectsByRecurrence } from "../../services/lib/object.service.js";
import { linkPreviewGenerator } from "../../services/lib/linkPreview.service.js";
import { saveContent } from "../../utils/helper.service.js";
import { linearQueue } from "../../loaders/bullmq.loader.js";
import { Object } from "../../models/lib/object.model.js";

const extractUrl = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls[0] : null;
};

const generateLinkPreview = async (requestedData) => {
    const url = requestedData.metadata?.url;

    const { title: previewTitle, favicon } = await linkPreviewGenerator(url);

    return {
        ...requestedData,
        title: previewTitle || requestedData.title,
        metadata: {
            ...requestedData.metadata,
            url,
            favicon
        }
    };
};

const createObjectController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { array, block } = req.params;
        const requestedData = req.body;
        const { type } = requestedData;

        let objectData = requestedData;

        if (type === 'link' || type === 'text') {
            const updatedData = await generateLinkPreview(requestedData);
            if (updatedData) {
                objectData = updatedData;
            }
        }

        const object = await createObject(user, objectData, array, block);

        return res.status(200).json({ object });
    } catch (err) {
        next(err);
    }
};

const createInboxObjectController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const requestedData = req.body;
        const { title = "", description = "", type, source } = requestedData;

        let objectData = { ...requestedData, description };

        if (source === "linear") {
            const teamId = req.user.integration.linear?.linearTeam?.teamId;
            const accessToken = req.user.integration.linear?.accessToken;

            if (!teamId || !accessToken) {
                return res.status(400).json({ error: "Linear integration is not configured for this user." });
            }

            const object = await createInboxObject(user, objectData);

            await linearQueue.add('createIssue', {
                type: "createIssue",
                accessToken,
                teamId,
                user,
                title,
                description,
                objectId: object._id
            }, {
                attempts: 3, // Retry up to 3 times
                backoff: 1000, // Wait 1 second before retrying
                removeOnComplete: true
            })
            saveContent(object);

            return res.status(200).json({
                response: object
            });
        }

        if (type === "bookmark" && extractUrl(requestedData.title)) {
            const updatedData = await generateLinkPreview(requestedData);
            if (updatedData) {
                objectData = updatedData;
            }
        }
        const object = await createInboxObject(user, objectData);
        saveContent(object);

        res.status(200).json({
            response: object
        });
    } catch (err) {
        next(err);
    }
};

const updateObjectController = async (req, res, next) => {
    try {
        const { array, block, object: id } = req.params;
        const updateData = req.body;
        const object = await updateObject(id, updateData, array, block);

        res.status(200).json({
            object
        });
    } catch (err) {
        next(err);
    }
};

const filterObjectsController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const filters = {
            dueDate: req.query.dueDate
        };
        const sortOptions = req.query.sort;

        const objects = await filterObjects(user, filters, sortOptions);

        res.status(200).json({
            response: objects
        });
    } catch (err) {
        next(err);
    }
};

const getAllObjectsByBloackController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { array, block } = req.params;
        const objects = await getAllObjectsByBloack(user, array, block);

        res.status(200).json({
            objects
        });
    } catch (err) {
        next(err);
    }
};

const getObjectController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { array, block, object: id } = req.params;

        const object = await getObject(user, id, array, block);

        res.status(200).json({
            object
        });
    } catch (err) {
        next(err);
    }
};

const getObjectFilterByLabelController = async (req, res, next) => {
    const { name } = req.query;
    const { array } = req.params;
    const user = req.user._id;

    try {
        const objects = await getObjectFilterByLabel(name, user, array);
        res.status(200).json(objects);
    } catch (err) {
        next(err);
    }
};

const searchObjectsByTitleController = async (req, res, next) => {
    const { q } = req.query;
    const user = req.user._id;
    try {
        const objects = await searchObjectsByTitle(q, user);
        res.status(200).json({
            response: objects
        });
    } catch (err) {
        next(err);
    }
};

const getThisWeekObjectsByDateRangeController = async (req, res, next) => {
    try {
        const me = req.user._id;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                message: "Please provide both startDate and endDate."
            });
        }

        const objects = await getThisWeekObjectsByDateRange(me, new Date(startDate), new Date(endDate));

        res.status(200).json({
            response: objects
        });
    } catch (err) {
        next(err);
    }
};

const getUserFavoriteObjectsController = async (req, res, next) => {
    try {
        const user = req.user._id;

        const objects = await getUserFavoriteObjects(user);

        res.status(200).json({
            response: objects
        });
    } catch (err) {
        next(err);
    }
};

const getSubObjectsController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { object: parentId } = req.params;

        const subObjects = await getSubObjects(user, parentId);

        res.status(200).json({
            response: subObjects
        });
    } catch (err) {
        next(err);
    }
};

const getObjectsByTypeAndSourceController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { type, source } = req.query;
        const objects = await getObjectsByTypeAndSource(user, { type, source });
        res.json({
            objects
        });
    } catch (error) {
        next(error);
    }
}

const getObjectsBySourceController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { source } = req.query;
        const objects = await getObjectsBySource(user, source);
        res.json({ objects });
    } catch (error) {
        next(error);
    }
}

export async function createObjectFromAI (content, user) {
    try {
        if (!content?.title || !user?._id) {
            throw new Error("Invalid content or user");
        }

        // Create object
        const object = await Object.create({ ...content });

        // Handle Linear-specific logic
        if (content.source === "linear") {
            const teamId = user.integration?.linear?.linearTeam?.teamId;
            const accessToken = user.integration?.linear?.accessToken;

            if (!teamId || !accessToken) {
                throw new Error("Linear integration is not configured for this user.");
            }

            await linearQueue.add('createIssue', {
                type: "createIssue",
                accessToken,
                teamId,
                user: user._id,
                title: content.title,
                description: content.description,
                objectId: object._id
            }, {
                attempts: 3,
                backoff: 1000,
                removeOnComplete: true
            });
        }

        await saveContent(object);
        return object;
    } catch (error) {
        console.error("Error creating object from AI:", error);
        throw error;
    }
}

export const getUserUpcomingObjectsController = async (req, res, next) => {
    try {
        const user = req.user._id;
        const objects = await getUserUpcomingObjects(user);
        res.json({ objects });
    } catch (error) {
        next(error);
    }
}

export const getObjectsByRecurrenceController = async (req, res, next) => {
    try {
        console.log('Recurrence API called');
        const user = req.user._id;
        // console.log('User ID:', user);
        const objects = await getObjectsByRecurrence(user);
        console.log('Recurrence objects found:', objects.length);
        res.json({ objects });
    } catch (error) {
        console.error('Error in getObjectsByRecurrenceController:', error);
        next(error);
    }
}

export {
    createObjectController,
    filterObjectsController,
    updateObjectController,
    getObjectController,
    getObjectFilterByLabelController,
    searchObjectsByTitleController,
    getAllObjectsByBloackController,
    createInboxObjectController,
    getThisWeekObjectsByDateRangeController,
    getUserFavoriteObjectsController,
    getSubObjectsController,
    getObjectsByTypeAndSourceController,
    getObjectsBySourceController,
}
