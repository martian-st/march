import { Schema } from "mongoose";
import { v4 as uuid } from "uuid";
import { db } from "../../loaders/db.loader.js";

const statusChoices = ["null", "todo", "in progress", "done", "archive"];

const ObjectSchema = new Schema(
    {
        uuid: {
            type: String,
            default: () => uuid()
        },
        title: {
            type: String
        },
        order: {
            type: Number,
            default: 0,
            index: true
        },
        icon: {
            type: String,
            default: ''
        },
        cover_image: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: "todo",
            required: true
        },
        source: {
            type: String,
            default: "march"
        },
        description: {
            type: Schema.Types.Mixed,
            default: []
        },
        due: {
            date: {
                type: String,
                default: null
            },
            is_recurring: {
                type: Boolean,
                default: false
            },
            lang: {
                type: String,
                default: "en"
            },
            string: {
                type: String,
                default: null
            },
            timezone: {
                type: String,
                default: "UTC"
            }
        },
        cycle: {
            startsAt: {
                type: Date,
                default: null
            },
            endsAt: {
                type: Date,
                default: null
            }
        },
        status: {
            type: String,
            enum: statusChoices,
            default: "null"
        },
        id: {
            type: String
        },
        metadata: {
            type: Schema.Types.Mixed
        },
        createdAt: {
            type: Date
        },
        updatedAt: {
            type: Date
        },
        arrays: [
            {
                type: Schema.Types.ObjectId,
                ref: "Array"
            }
        ],
        blocks: [
            {
                type: Schema.Types.ObjectId,
                ref: "Block"
            }
        ],
        user: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Item'
        },
        labels: [
            {
                type: Schema.Types.ObjectId,
                ref: "Label"
            }
        ],
        isFavorite: {
            type: Boolean,
            default: false,
            index: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        isArchived: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

ObjectSchema.pre("save", async function (next) {
    if (this.status === "done") {
        this.isCompleted = true;
    } else {
        this.isCompleted = false;
    }

    if (this.isCompleted && !this.completedAt) {
        this.completedAt = new Date();
    }

    if (this.isNew) {
        const lastItem = await this.constructor
            .findOne(this.parent ? { parent: this.parent } : {})
            .sort({ order: -1 });

        this.order = lastItem ? lastItem.order + 1 : 0;
    }

    next();
});

ObjectSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
    
    // Handle status updates
    if (update.$set && update.$set.status === "done") {
        update.$set.isCompleted = true;
        update.$set.completedAt = new Date();
    } else if (update.$set && update.$set.status) {
        update.$set.isCompleted = false;
        update.$set.completedAt = null;
    }
    
    // Ensure dueDate is properly handled as a Date object
    if (update.$set && update.$set.dueDate && typeof update.$set.dueDate === 'string') {
        update.$set.dueDate = new Date(update.$set.dueDate);
    }

    next();
});

const Object = db.model("Object", ObjectSchema, "objects");

export { Object };
