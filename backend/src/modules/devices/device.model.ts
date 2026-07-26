import { Schema, model, Document } from "mongoose";


export interface IDevice extends Document {

    deviceId: string;

    organizationId: string;
    ownerUserId: string;

    typeId: string;

    name: string;

    hardware: string;

    firmwareVersion: string;

    online: boolean;

    lastSeen?: Date;

    state?: any;

    location?: {
        latitude: number;
        longitude: number;
        label?: string;
    };


    lastCommand?: any;


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
    },


    state:{
        type:Object,
        default:{}
    },
    ownerUserId: {
        type: String,
        required: true,
        index: true
    },

    location: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        },
        label: {
            type: String,
            trim: true,
            maxlength: 120
        }
    },


    lastCommand:{
        type:Object,
        default:{}
    }

},
{
    timestamps:true
});


export default model<IDevice>(
    "Device",
    DeviceSchema
);
