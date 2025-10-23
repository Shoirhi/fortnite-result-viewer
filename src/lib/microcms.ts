import type { MicroCMSQueries, MicroCMSListContent } from "microcms-js-sdk";
import { MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY } from "astro:env/server";
import { createClient } from "microcms-js-sdk";

const client = createClient({
    serviceDomain: MICROCMS_SERVICE_DOMAIN,
    apiKey: MICROCMS_API_KEY,
});

export type Event = {
    title: string;
    score: string;
} & MicroCMSListContent;

export const getEvents = async (queries?: MicroCMSQueries) => {
    return await client.getList<Event>({
        endpoint: "events",
        queries,
        customRequestInit: {
            cache: "no-store",
        },
    });
};

export const getEventDetail = async (
    contentId: string,
    queries?: MicroCMSQueries
) => {
    return await client.getListDetail<Event>({
        endpoint: "events",
        contentId,
        queries,
        customRequestInit: {
            cache: "no-store",
        },
    });
};
