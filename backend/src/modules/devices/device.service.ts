import Device from "./device.model";
import bcrypt from "bcrypt";


export async function seedDevices() {
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