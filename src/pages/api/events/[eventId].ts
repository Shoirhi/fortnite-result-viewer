import type { APIRoute } from "astro";
import { ensureEventId, loadEvent } from "@/lib/event-utils";

export const prerender = false;

const NO_STORE_HEADERS = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ params }) => {
    const eventId = ensureEventId(params?.eventId);

    try {
        const event = await loadEvent(eventId);

        return new Response(
            JSON.stringify({
                event,
                updatedAt: event.updatedAt,
            }),
            {
                status: 200,
                headers: new Headers(NO_STORE_HEADERS),
            },
        );
    } catch (error) {
        if (error instanceof Response) {
            const headers = new Headers(NO_STORE_HEADERS);
            for (const [key, value] of error.headers.entries()) {
                headers.set(key, value);
            }

            return new Response(error.body, {
                status: error.status,
                statusText: error.statusText,
                headers,
            });
        }

        console.error("Failed to load event", eventId, error);

        return new Response(null, {
            status: 500,
            statusText: "Internal Server Error",
            headers: new Headers(NO_STORE_HEADERS),
        });
    }
};
