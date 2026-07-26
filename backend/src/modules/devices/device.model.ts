import { Schema, model, Document } from "mongoose";


export interface IDevice extends Document {

    deviceId: string;

    organizationId: string;

    typeId: string;

    name: string;

    hardware: string;

    firmwareVersion: string;

    online: boolean;

    lastSeen?: Date;


    mqtt: {

        username: string;

        passwordHash: string;

    };


    createdAt: Date;

    updatedAt: Date;

}


const DeviceSchema = new Schema<IDevice>(
{

    deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },


    organizationId: {
        type: String,
        required: true,
        index: true
    },


    typeId: {
        type: String,
        required: true,
        index: true
    },


    name: {
        type: String,
        required: true
    },


    hardware: {
        type: String,
        default: "unknown"
    },


    firmwareVersion: {
        type: String,
        default: "0.0.0"
    },

    mqtt: {
        username: {
            type: String,
            required: true,
            unique: true,
            index: true
        },


        passwordHash: {
            type: String,
            required: true
        }

    },

    
    online: {
        type: Boolean,
        default: false
    },


    lastSeen: {
        type: Date
    }

},
{
    timestamps:true
});


export default model<IDevice>(
    "Device",
    DeviceSchema
);