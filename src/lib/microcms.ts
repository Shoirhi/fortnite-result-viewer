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

export type EventSummary = Omit<Event, "score">;

const EVENT_SUMMARY_FIELDS = ["id", "title", "publishedAt", "updatedAt"].join(",");

export const getEvents = async (queries?: MicroCMSQueries) => {
    const nextQueries: MicroCMSQueries = {
        ...queries,
        fields: queries?.fields ?? EVENT_SUMMARY_FIELDS,
    };

    return await client.getList<EventSummary>({
        endpoint: "events",
        queries: nextQueries,
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
