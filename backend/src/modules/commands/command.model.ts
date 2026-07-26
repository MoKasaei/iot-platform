import { Schema, model, Document } from "mongoose";


export interface ICommand extends Document {

    organizationId:string;

    deviceId:string;

    command:{
        command:string;
        value?:unknown;
    };

    status:
        | "pending"
        | "sent"
        | "received"
        | "completed"
        | "failed"
        | "timeout";

    createdAt:Date;

    sentAt?:Date;

    acknowledgedAt?:Date;

    result?:unknown;

}



const CommandSchema = new Schema<ICommand>(
{

    organizationId:{
        type:String,
        required:true,
        index:true
    },


    deviceId:{
        type:String,
        required:true,
        index:true
    },


    command:{

        command:{
            type:String,
            required:true
        },

        value:{
            type:Schema.Types.Mixed
        }

    },


    status:{
        type:String,
        enum:[
            "pending",
            "sent",
            "received",
            "completed",
            "failed",
            "timeout"
        ],
        default:"pending",
        index:true
    },


    sentAt:{
        type:Date
    },


    acknowledgedAt:{
        type:Date
    },


    result:{
        type:Schema.Types.Mixed
    }


},
{
    timestamps:true
});


// Command history lookup
CommandSchema.index({
    deviceId:1,
    createdAt:-1
});


// Remove old commands after 7 days
CommandSchema.index(
{
    createdAt:1
},
{
    expireAfterSeconds:604800
});


export default model<ICommand>(
    "Command",
    CommandSchema
);