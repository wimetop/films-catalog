import { expect, it } from "vitest";

import { queueNames } from "./names";

it("uses stable queue and job names", () => {
  expect(queueNames.catalog).toBe("catalog");
  expect(queueNames.favoritesRecount).toBe("favorites:recount");
  expect(queueNames.trendingRebuild).toBe("trending:rebuild");
  expect(queueNames.cacheWarm).toBe("cache:warm");
});
