import type { APIRoute } from "astro";
import { getEvents } from "@/lib/microcms";

export const prerender = false;

const NO_STORE_HEADERS = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
};

export const GET: APIRoute = async () => {
    try {
        const { contents } = await getEvents({ orders: "-publishedAt" });

        return new Response(
            JSON.stringify({
                events: contents,
                fetchedAt: new Date().toISOString(),
            }),
            {
                status: 200,
                headers: new Headers(NO_STORE_HEADERS),
            },
        );
    } catch (error) {
        console.error("Failed to load events list", error);

        return new Response(null, {
            status: 500,
            statusText: "Internal Server Error",
            headers: new Headers(NO_STORE_HEADERS),
        });
    }
};
