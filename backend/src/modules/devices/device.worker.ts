import Device from "./device.model";


setInterval(async()=>{

    try {

        const timeout =
            new Date(
                Date.now() - 90000
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


    } catch(error){

        console.error(
            "Device worker error",
            error
        );

    }


},30000);
