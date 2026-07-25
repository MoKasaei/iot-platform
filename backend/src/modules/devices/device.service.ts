import Device from "./device.model";


export async function seedDevices() {


    const exists = await Device.findOne({
        deviceId:"AHU001"
    });


    if(exists)
        return;



    await Device.create({

        deviceId:"AHU001",

        organizationId:"ORG001",

        typeId:"AHU",

        name:"Lobby AHU",

        hardware:"ESP8266",

        firmwareVersion:"1.0.0"

    });


    console.log("✅ Test device created");

}