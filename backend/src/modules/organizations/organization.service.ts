import Organization from "./organization.model";

export async function seedOrganization() {

    const exists = await Organization.findOne({
        organizationId: "ORG001"
    });

    if (exists)
        return;

    await Organization.create({

        organizationId: "ORG001",

        name: "Default Organization"

    });

    console.log("✅ Default organization created");
}