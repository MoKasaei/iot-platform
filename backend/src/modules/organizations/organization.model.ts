import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    active: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },

        email: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            default: "",
        },

        address: {
            type: String,
            default: "",
        },

        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IOrganization>(
    "Organization",
    OrganizationSchema
);