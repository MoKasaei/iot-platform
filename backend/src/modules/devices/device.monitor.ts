import Device from "./device.model";


export function startDeviceMonitor(){

    console.log(
        "Device monitor started"
    );


    setInterval(async()=>{


        try{


            const timeout =
                new Date(
                    Date.now() - 15000
                );


            const result =
                await Device.updateMany(
                    {
                        lastSeen:{
                            $lt:timeout
                        },

                        online:true
                    },

                    {
                        online:false
                    }
                );



            if(result.modifiedCount > 0){

                console.log(
                    "Devices marked offline:",
                    result.modifiedCount
                );

            }


        }catch(error){


            console.error(
                "Device monitor error:",
                error
            );


        }


    },5000);


}
