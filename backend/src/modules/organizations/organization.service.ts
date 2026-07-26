import Organization from "./organization.model";

export async function seedOrganization() {
    const organizationId = process.env.ADMIN_ORGANIZATION_ID || "ORG001";

    const exists = await Organization.findOne({
        organizationId
    });

    if (exists)
        return;

    await Organization.create({

        organizationId,

        name: process.env.ORGANIZATION_NAME || "Default Organization",

        ...(process.env.ORGANIZATION_LOGO
            ? { logo: process.env.ORGANIZATION_LOGO }
            : {})

    });

    console.log("✅ Default organization created");
}
