import Device from "./device.model";
import bcrypt from "bcrypt";
import User from "../users/user.model";


export async function seedDevices() {
    const primaryAdmin = await User.findOne({
        email: process.env.ADMIN_EMAIL?.toLowerCase()
    });
    if (!primaryAdmin) {
        throw new Error("Primary administrator is required before devices are seeded");
    }

    await Device.updateMany(
        { ownerUserId: { $exists: false } },
        { $set: { ownerUserId: primaryAdmin.userId } }
    );
    const exists = await Device.findOne({
        deviceId:"AHU001"
    });


    console.log("Seed check result:", exists);


    if(exists) {

        console.log("Device already exists");
        return;

    }



    const password = "test123";


    const passwordHash =
        await bcrypt.hash(password, 10);


    console.log("Creating AHU001...");


    await Device.create({

        deviceId:"AHU001",

        organizationId:"ORG001",
        ownerUserId: primaryAdmin.userId,

        typeId:"AHU",

        name:"Lobby AHU",

        hardware:"ESP8266",

        firmwareVersion:"1.0.0",


        mqtt: {

            username:"ahu001",

            passwordHash

        }

    });


    console.log(
        "✅ Test device created"
    );

    console.log(
        "MQTT username: ahu001"
    );

    console.log(
        "MQTT password: test123"
    );

}

export async function setDeviceOnline(
    deviceId:string
){

    await Device.updateOne(
        {
            deviceId
        },
        {
            $set:{
                online:true,
                lastSeen:new Date()
            }
        }
    );

    console.log(
        `Device online: ${deviceId}`
    );

}



export async function setDeviceOffline(
    deviceId:string
){

    await Device.updateOne(
        {
            deviceId
        },
        {
            $set:{
                online:false,
                lastSeen:new Date()
            }
        }
    );


    console.log(
        `Device offline: ${deviceId}`
    );

}
