import { defineCollection } from "astro:content";
import { MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY } from "astro:env/server";
import { microCMSContentLoader } from "microcms-astro-loader";

const events = defineCollection({
  loader: microCMSContentLoader({
      serviceDomain: MICROCMS_SERVICE_DOMAIN,
      apiKey: MICROCMS_API_KEY,
      endpoint: "events",
  }),
});

export const collections = { events };