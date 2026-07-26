import { Schema, model, Document } from "mongoose";


export interface ITelemetry extends Document {

    organizationId:string;

    deviceId:string;

    timestamp:Date;

    data:Record<string, unknown>;

}



const TelemetrySchema = new Schema<ITelemetry>(
{

    organizationId:{
        type:String,
        required:true
    },


    deviceId:{
        type:String,
        required:true
    },


    timestamp:{
        type:Date,
        default:Date.now
    },


    data:{
        type:Schema.Types.Mixed,
        required:true
    }

});



// Fast history lookup
TelemetrySchema.index({

    organizationId:1,

    deviceId:1,

    timestamp:-1

});



// Delete telemetry older than 7 days
TelemetrySchema.index(
{
    timestamp:1
},
{
    expireAfterSeconds:604800
});


export default model<ITelemetry>(
    "Telemetry",
    TelemetrySchema
);