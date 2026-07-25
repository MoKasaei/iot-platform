import DeviceType from "./device-type.model";


export async function seedDeviceTypes() {


    const exists = await DeviceType.findOne({
        typeId:"AHU"
    });


    if(exists)
        return;



    await DeviceType.create({

        typeId:"AHU",

        name:"Air Handling Unit",

        icon:"air-conditioning",


        telemetry: {

            temperature: {

                label:"Temperature",

                valueType:"number",

                unit:"°C",

                history:true

            },


            humidity: {

                label:"Humidity",

                valueType:"number",

                unit:"%",

                history:true

            },


            fan: {

                label:"Supply Fan",

                valueType:"boolean",

                history:false

            }

        },


        commands: {


            START: {

                label:"Start"

            },


            STOP: {

                label:"Stop"

            }

        }

    });


    console.log("✅ AHU device type created");

}