import { getDb } from "./queries/connection";
import { appSettings } from "@db/schema";
import { createRouter, publicQuery } from "./middleware";

export const settingsRouter = createRouter({
  getPublic: publicQuery.query(async () => {
    const db = getDb();
    const all = await db.select().from(appSettings);
    const map: Record<string, string> = {};
    for (const row of all) map[row.key] = row.value ?? "";
    return map;
  }),
});
