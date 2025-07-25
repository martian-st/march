import { Object } from "../../models/lib/object.model.js";
import { getLabelByName } from "./label.service.js";

const getInboxObjects = async (me) => {
    const objects = await Object.find({
        user: me,
        isCompleted: false,
        isArchived: false,
        isDeleted: false,
        // arrays: { $exists: true, $eq: [] },
        status: { $nin: ["archive", "done"] },
        "due.date": null,
        "due.is_recurring": false,
        "cycle.startsAt": null,
        "cycle.endsAt": null
    }).sort({ order: -1 });

    return objects;
}
export const getObjectsWithDate = async (me) => {
    const objects = await Object.find({
        user: me,
        isCompleted: false,
        isArchived: false,
        isDeleted: false,
        arrays: { $exists: true, $eq: [] },
        status: { $nin: ["archive", "done"] },
        "due.date": { $exists: true, $ne: null }
    }).sort({ "due.date": 1, createdAt: -1 });

    return objects;
}

export const reorderObjects = async (orderedItems) => {
    const bulkOps = orderedItems.map(({ id, order }) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { order } }
        }
    }));

    await Object.bulkWrite(bulkOps);
}

const getInboxObject = async (me, id) => {
    const objects = await Object.findOne({
        user: me,
        _id: id,
        isArchived: false,
        isDeleted: false
    })

    return objects;
}

const getThisWeekObjects = async (me) => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const objects = await Object.find({
        user: me,
        isArchived: false,
        isDeleted: false,
        spaces: { $exists: true, $eq: [] },
        $or: [
            { status: { $nin: ["done"] } },
            {
                status: "done",
                cycleDate: { $gte: startOfWeek, $lte: endOfWeek }
            }
        ],
        cycleDate: { $ne: null }
    })
        .sort({ createdAt: -1 });
    return objects;
}

const getThisWeekObjectsByDateRange = async (me, startDate, endDate) => {
    if (!me || !startDate || !endDate) {
        throw new Error('Missing required parameters: me, startDate, endDate');
    }

    if (startDate > endDate) {
        throw new Error('startDate must be before or equal to endDate');
    }

    startDate = new Date(startDate);
    startDate.setUTCHours(0, 0, 0, 0);

    endDate = new Date(endDate);
    endDate.setUTCHours(23, 59, 59, 999);

    const objects = await Object.find({
        user: me,
        isArchived: false,
        isDeleted: false,
        spaces: { $exists: true, $eq: [] },
        $or: [
            { "cycle.startsAt": { $gte: startDate, $lte: endDate } },
            { "cycle.endsAt": { $gte: startDate, $lte: endDate } },
            { "due.date": { $gte: startDate, $lte: endDate } }
        ]
    }).sort({ createdAt: 1 });

    return objects;
};

const getAllObjects = async (me) => {
    const objects = await Object.find({
        user: me,
        isDeleted: false
    })
        .sort({ createdAt: -1 });

    return objects;
}

const getUserTodayObjects = async (me) => {
    const today = new Date();
    // Create dates in UTC
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));


    // First, get all objects that might be due today
    const allObjects = await Object.find({
        user: me,
        isArchived: false,
        isDeleted: false,
        $or: [
            // Get objects completed today
            { completedAt: { $gte: startOfDay, $lt: endOfDay } },
            // Get objects with due dates
            { "due.date": { $exists: true, $ne: null } }
        ]
    });

    // Filter objects to find those that are due today
    const objects = allObjects.filter(obj => {
        // If completed today, include it
        if (obj.completedAt && new Date(obj.completedAt) >= startOfDay && new Date(obj.completedAt) < endOfDay) {
            return true;
        }
        
        // Check if due date is today
        if (obj.due && obj.due.date) {
            const dueDate = new Date(obj.due.date);
            const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate(), 0, 0, 0, 0));
            const isSameDay = dueDateUTC.getTime() === startOfDay.getTime();
            return isSameDay;
        }
        
        return false;
    });

    return objects;
}

const getUserOverdueObjects = async (me) => {
    const now = new Date();
    // Create date in UTC
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    // Get all incomplete objects with due dates
    const allObjects = await Object.find({
        user: me,
        "due.date": { $exists: true, $ne: null },
        isCompleted: false,
        isArchived: false,
        isDeleted: false
    }).sort({ createdAt: -1 });
    
    // Filter to find objects that are truly overdue (before today)
    const objects = allObjects.filter(obj => {
        if (obj.due && obj.due.date) {
            const dueDate = new Date(obj.due.date);
            // Convert to UTC date with time set to 00:00:00
            const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate(), 0, 0, 0, 0));
            // Check if due date is before today
            const isOverdue = dueDateUTC.getTime() < startOfToday.getTime();
            return isOverdue;
        }
        return false;
    });
    

    return objects;
}

const getUserObjectsByDate = async (me, date) => {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const objects = await Object.find({
        user: me,
        isArchived: false,
        isDeleted: false,
        $or: [
            { "due.date": { $gte: startOfDay, $lte: endOfDay } },
            { completedAt: { $gte: startOfDay, $lte: endOfDay } }
        ]
    }).sort({ createdAt: -1 });

    return objects;
};

const createObject = async (user, objectData, array, block) => {
    if (!array || !block) {
        const error = new Error("Array and block must be provided");
        error.statusCode = 400;
        throw error;
    }
    const newObject = new Object({
        ...objectData,
        user,
        arrays: [array],
        blocks: [block]
    });
    if (!newObject) {
        const error = new Error("Failed to create the object")
        error.statusCode = 500
        throw error
    }

    const object = await newObject.save()

    return object;
};

const createInboxObject = async (user, objectData) => {
    const newObject = new Object({
        ...objectData,
        user
    });
    if (!newObject) {
        const error = new Error("Failed to create the object")
        error.statusCode = 500
        throw error
    }

    const object = await newObject.save()

    return object;
};

const updateInboxObject = async (object, user, objectData) => {
    const updatedObject = await Object.findOneAndUpdate({
        _id: object,
        user
    },
    { $set: objectData },
    { new: true }
    )
    if (!updatedObject) {
        const error = new Error("Object not found or you do not have permission to update it");
        error.statusCode = 404;
        throw error;
    }
    return updatedObject;
};

export const deleteInboxObject = async (object, user) => {
    const deletedObject = await Object.findOneAndUpdate({
        _id: object,
        user,
        isDeleted: true
    })
    return deletedObject
}

const filterObjects = async (user, filters, sortOptions) => {
    const query = {
        user,
        isArchived: false,
        isDeleted: false
    };
    const sort = {};
    const startOfWeek = new Date();
    const endOfWeek = new Date(startOfWeek);
    const startOfMonth = new Date();
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    if (filters.dueDate) {
        const dueDateFilters = filters.dueDate.split(',');
        const dueDateConditions = [];

        dueDateFilters.forEach((dueDateFilter) => {
            switch (dueDateFilter) {
            case 'no-date':
                dueDateConditions.push({ dueDate: null });
                break;
            case 'before-today':
                dueDateConditions.push({ dueDate: { $lt: new Date().setHours(0, 0, 0, 0) } });
                break;
            case 'today':
                dueDateConditions.push({
                    dueDate: {
                        $gte: new Date().setHours(0, 0, 0, 0),
                        $lt: new Date().setHours(23, 59, 59, 999)
                    }
                });
                break;
            case 'after-today':
                dueDateConditions.push({ dueDate: { $gt: new Date().setHours(23, 59, 59, 999) } });
                break;
            case 'this-week':
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                dueDateConditions.push({
                    dueDate: { $gte: startOfWeek, $lt: endOfWeek }
                });
                break;
            case 'this-month':
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                dueDateConditions.push({
                    dueDate: { $gte: startOfMonth, $lt: endOfMonth }
                });
                break;
            default:
                break;
            }
        });

        if (dueDateConditions.length > 0) {
            query.$or = dueDateConditions;
        }
    }

    // sorting
    if (sortOptions) {
        const sortParams = sortOptions.split(',');

        sortParams.forEach(sortParam => {
            const [by, direction] = sortParam.split(':');
            sort[by] = direction === 'asc' ? 1 : -1;
        });
    } else {
        // Default sorting by creation date (newest on top)
        sort.createdAt = -1;
    }

    return await Object.find(query).sort(sort);
};

const getObject = async (user, id, array, block) => {
    const object = await Object.find({
        _id: id,
        user,
        arrays: { $elemMatch: { $eq: array } },
        blocks: { $elemMatch: { $eq: block } },
        isArchived: false,
        isDeleted: false
    })

    return object;
};

const getAllObjectsByBloack = async (user, array, block) => {
    const object = await Object.find({
        user,
        arrays: { $elemMatch: { $eq: array } },
        blocks: { $elemMatch: { $eq: block } },
        isArchived: false,
        isDeleted: false
    })

    return object;
};

const updateObject = async (id, updateData, array, block) => {
    const updatedObject = await Object.findOneAndUpdate({
        _id: id,
        arrays: { $elemMatch: { $eq: array } },
        blocks: { $elemMatch: { $eq: block } }
    },
    { $set: updateData },
    { new: true }
    )

    return updatedObject;
};

const moveObjecttoDate = async (date, id) => {
    const formattedDate = date ? new Date(date) : null;
    
    // Get the current object to check for recurrence
    const currentObject = await Object.findById(id);
    
    // Get recurrence pattern from the current due object if it exists
    const recurrencePattern = currentObject?.due?.string || null;
    const isRecurring = currentObject?.due?.is_recurring || false;
    
    // Create the structured due object
    let dueObject = null;
    
    if (formattedDate) {
        dueObject = {
            date: formattedDate.toISOString(),
            is_recurring: isRecurring,
            lang: currentObject?.due?.lang || "en",
            string: recurrencePattern,
            timezone: currentObject?.due?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        };
    }
    
    const object = await Object.findByIdAndUpdate(
        id,
        { 
            $set: { 
                // Set the structured due object
                due: dueObject
            } 
        },
        { new: true }
    );

    return object;
};

const getObjectFilterByLabel = async (name, userId, array) => {
    const label = await getLabelByName(name, userId, array);
    const objects = await Object.find({
        labels: { $in: [label._id] },
        user: userId
    })

    return objects;
};

const searchObjectsByTitle = async (title, user) => {
    const objects = await Object.find({
        title: { $regex: title, $options: 'i' },
        isDeleted: false,
        user
    }).exec();

    return objects;
};

const getUserFavoriteObjects = async (user) => {
    const objects = await Object.find({
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        user
    })

    return objects;
};

const getSubObjects = async (user, parentId) => {
    const subobjects = await Object.find({
        parent: parentId,
        user,
        isArchived: false,
        isDeleted: false,
        isCompleted: false
    });
    if (!subobjects.length) {
        const error = new Error("No sub-objects found for this parent object.");
        error.statusCode = 404;
        throw error;
    }
    return subobjects;
};

const getObjectsByTypeAndSource = async (user, { type, source }) => {
    const query = { user, isArchived: false, isDeleted: false };

    if (type) {
        query.type = type;
    }

    if (source) {
        query.source = source;
    }

    const objects = await Object.find(query);
    return objects;
}

const getObjectsBySource = async (user, source) => {
    const objects = await Object.find({
        source,
        user,
        isArchived: false,
        isDeleted: false
    })
    return objects;
}

export const getUserUpcomingObjects = async (user) => {
    const objects = await Object.find({
        user,
        isArchived: false,
        isDeleted: false,
        isCompleted: false,
        'due.date': { $gte: new Date().toISOString() }
    });
    return objects;
}

export const getObjectsByRecurrence = async (user) => {
    const query = {
        user,
        isArchived: false,
        isDeleted: false,
        'due.is_recurring': true
    };
    
    const objects = await Object.find(query).sort({ 'due.date': 1 });
    
    return objects;
}

export {
    getInboxObjects,
    getInboxObject,
    createObject,
    filterObjects,
    updateObject,
    getObject,
    getUserOverdueObjects,
    getUserObjectsByDate,
    moveObjecttoDate,
    getThisWeekObjects,
    getAllObjects,
    getObjectFilterByLabel,
    getAllObjectsByBloack,
    updateInboxObject,
    searchObjectsByTitle,
    createInboxObject,
    getUserTodayObjects,
    getThisWeekObjectsByDateRange,
    getUserFavoriteObjects,
    getSubObjects,
    getObjectsByTypeAndSource,
    getObjectsBySource,
}
