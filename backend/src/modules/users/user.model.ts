import { Document, model, Schema } from "mongoose";

export type UserRole = "admin" | "user";

export interface IUser extends Document {
    userId: string;
    organizationId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    userId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

export default model<IUser>("User", UserSchema);
