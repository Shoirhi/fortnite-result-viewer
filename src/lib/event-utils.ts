import { getEventDetail } from "@/lib/microcms";
import type { Event } from "@/lib/microcms";

export {
    FALLBACK_TOTAL_MATCHES_LABEL,
    DEFAULT_STANDINGS_CHUNK_SIZE,
    DEFAULT_MATCH_HEADING_LABEL,
    parseTournamentResults,
    chunkArray,
    createStandingsSummary,
    createMatchStandingsSummary,
    type StandingsSummary,
    type MatchStandingsSummary,
} from "@/lib/standings-summary";

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
