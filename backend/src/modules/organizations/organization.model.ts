import { Schema, model, Document } from "mongoose";

export interface IOrganization extends Document {

    organizationId: string;

    name: string;
    code?: string;

    description?: string;
    logo?: string;

    active: boolean;

    createdAt: Date;

    updatedAt: Date;
}

const schema = new Schema<IOrganization>(
    {

        organizationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        name: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },
        code: {
            type: String,
            trim: true,
            maxlength: 40
        },
        logo: {
            type: String
        },

        active: {
            type: Boolean,
            default: true
        }

    },
    {
        timestamps: true
    }
);

export default model<IOrganization>("Organization", schema);
