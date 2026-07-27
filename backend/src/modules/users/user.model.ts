import { Document, model, Schema } from "mongoose";

export type UserRole = "admin" | "user";

export interface IUser extends Document {
    userId: string;
    organizationId: string;
    name: string;
    nickname?: string;
    profilePhoto?: string;
    deviceLimit: number | null;
    theme: "default" | "dark" | "spring" | "summer" | "autumn" | "winter";
    fontSize: "standard" | "large" | "extra-large";
    muteAlarmNotifications: boolean;
    email?: string;
    phone?: string;
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
    nickname: { type: String, trim: true, maxlength: 80 },
    profilePhoto: { type: String },
    deviceLimit: { type: Number, default: 1, min: 0, max: 100 },
    theme: { type: String, enum: ["default", "dark", "spring", "summer", "autumn", "winter"], default: "default" },
    fontSize: { type: String, enum: ["standard", "large", "extra-large"], default: "large" },
    muteAlarmNotifications: { type: Boolean, default: false },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    phone: { type: String, unique: true, sparse: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

export default model<IUser>("User", UserSchema);
