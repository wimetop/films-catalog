import {config} from "dotenv";
import {defineConfig} from "drizzle-kit";

config({ path : ".env.local"});

const databaseUrl = process.env.DIRECT_URL;
if(!databaseUrl)
    {
        throw new Error("DIRECT_URL is not defined");
    }

export default defineConfig(
    {
        out : "./drizzle",
        schema: "./src/db/schema/index.ts",
        dialect: "postgresql",
        dbCredentials : 
        {
            url: databaseUrl,
        },
    });

    