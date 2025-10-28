import { getEventDetail } from "@/lib/microcms";
import type { Event } from "@/lib/microcms";

type ErrorWithStatus = { status?: number };

export function ensureEventId(value: string | undefined | null): string {
    if (!value) {
        throw new Response(null, { status: 404, statusText: "Not Found" });
    }

    return value;
}

function isNotFoundError(error: unknown): error is ErrorWithStatus {
    return (
        typeof (error as ErrorWithStatus)?.status === "number" &&
        (error as ErrorWithStatus).status === 404
    );
}

export async function loadEvent(eventId: string): Promise<Event> {
    try {
        const event = await getEventDetail(eventId);
        if (!event) {
            throw new Response(null, { status: 404, statusText: "Not Found" });
        }

        return event;
    } catch (error) {
        if (isNotFoundError(error)) {
            throw new Response(null, { status: 404, statusText: "Not Found" });
        }

        throw error;
    }
}
