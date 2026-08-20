import { config } from "dotenv";

import { createDatabase } from "@/db/client";
import { items } from "@/db/schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

const { db, dbClient } = createDatabase(databaseUrl);

const seedItems = [
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000001",
    title: "Interstellar",
    description:
      "A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000002",
    title: "Inception",
    description:
      "A skilled thief enters dreams to steal secrets and is offered one last impossible mission.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000003",
    title: "The Matrix",
    description:
      "A programmer discovers that reality is a simulated world controlled by machines.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000004",
    title: "Dune",
    description:
      "A young nobleman must survive on a dangerous desert planet and confront his destiny.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000005",
    title: "Blade Runner 2049",
    description:
      "A replicant hunter uncovers a secret that could destabilize what remains of society.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000006",
    title: "The Dark Knight",
    description:
      "Batman faces a criminal mastermind who pushes Gotham City into chaos.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000007",
    title: "Parasite",
    description:
      "A financially struggling family gradually becomes entangled with a wealthy household.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000008",
    title: "Whiplash",
    description:
      "An ambitious drummer is pushed to his limits by an uncompromising music instructor.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000009",
    title: "The Grand Budapest Hotel",
    description:
      "A legendary concierge and his lobby boy become involved in an art theft and family dispute.",
    imageUrl: null,
  },
  {
    id: "0c7fc962-fc6f-4af2-a529-a5550a000010",
    title: "Spirited Away",
    description:
      "A young girl enters a mysterious spirit world while trying to save her parents.",
    imageUrl: null,
  },
];

async function seed() {
  await db.insert(items).values(seedItems).onConflictDoNothing();

  console.log(`Seed completed for ${seedItems.length} films.`);
}

seed()
  .catch((error) => {
    console.error("Failed to seed films.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbClient.end({ timeout: 5 });
  });
