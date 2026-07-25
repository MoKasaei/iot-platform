import { Schema, model, Document } from "mongoose";


export interface IDeviceType extends Document {

    typeId: string;

    name: string;

    icon: string;

    telemetry: object;

    commands: object;

    active: boolean;

    createdAt: Date;

    updatedAt: Date;
}


const DeviceTypeSchema = new Schema<IDeviceType>(
{
    typeId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },


    name: {
        type: String,
        required: true
    },


    icon: {
        type: String,
        default: "device"
    },


    telemetry: {
        type: Object,
        default: {}
    },


    commands: {
        type: Object,
        default: {}
    },


    active: {
        type: Boolean,
        default: true
    }

},
{
    timestamps:true
});


export default model<IDeviceType>(
    "DeviceType",
    DeviceTypeSchema
);