import { Document, model, Schema } from "mongoose";

export interface IAlarm extends Document {
    organizationId: string;
    deviceId: string;
    ownerUserId?: string;
    code: string;
    value: string;
    message: string;
    readBy: string[];
    dismissedBy: string[];
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AlarmSchema = new Schema<IAlarm>({
    organizationId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true, index: true },
    ownerUserId: { type: String, index: true },
    code: { type: String, required: true },
    value: { type: String, required: true },
    message: { type: String, required: true },
    readBy: { type: [String], default: [] },
    dismissedBy: { type: [String], default: [] },
    resolvedAt: { type: Date }
}, { timestamps: true });

AlarmSchema.index({ organizationId: 1, deviceId: 1, createdAt: -1 });

export default model<IAlarm>("Alarm", AlarmSchema);
