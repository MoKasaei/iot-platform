import { Schema, model, Document } from "mongoose";


export interface ITelemetry extends Document {

    organizationId: string;

    deviceId: string;

    timestamp: Date;

    data: Record<string, unknown>;

}



const TelemetrySchema = new Schema<ITelemetry>(
{

    organizationId: {
        type: String,
        required: true,
        index: true
    },


    deviceId: {
        type: String,
        required: true,
        index: true
    },


    timestamp: {
        type: Date,
        default: Date.now,
    },


    data: {
        type: Schema.Types.Mixed,
        required: true
    }

},
{
    timestamps: true
});


// Automatically delete data older than 7 days
TelemetrySchema.index(
    {
        timestamp: 1
    },
    {
        expireAfterSeconds: 604800
    }
);



export default model<ITelemetry>(
    "Telemetry",
    TelemetrySchema
);
