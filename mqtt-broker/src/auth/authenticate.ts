import bcrypt from "bcrypt";


interface ClientCredentials {

    username:string;

    password:string;

}


export async function authenticate(
    username:string,
    password:string
):Promise<boolean>{


    console.log(
        "MQTT login attempt:",
        username
    );


    /*
       Temporary test account

       Later this will query MongoDB
    */


    if(username !== "ahu001")
        return false;


    const validPassword =
        password === "test123";


    return validPassword;

}
