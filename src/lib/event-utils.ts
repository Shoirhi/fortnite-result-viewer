import { getEventDetail, type Event } from "@/lib/microcms";
import {
    buildCumulativeStandingsTimeline,
    buildMatchPlacementsTimeline,
    type CumulativeStandingEntry,
    type MatchPlacementEntry,
    type TournamentResults,
} from "@/lib/standings";

export const FALLBACK_TOTAL_MATCHES_LABEL = "Total Games";
export const DEFAULT_STANDINGS_CHUNK_SIZE = 10;
export const DEFAULT_MATCH_HEADING_LABEL = "Game Result";

type ErrorWithStatus = { status?: number };

export type StandingsSummary = {
    latestStandings: CumulativeStandingEntry[];
    chunkedStandings: CumulativeStandingEntry[][];
    totalMatches: number;
    totalMatchesLabel: string;
    totalTeams: number;
};

export type MatchStandingsSummary = {
    matchStandings: MatchPlacementEntry[];
    chunkedStandings: MatchPlacementEntry[][];
    headingLabel: string;
    totalTeams: number;
    matchIndex: number;
    matchDisplayNumber: number | "?";
    totalMatches: number;
};

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

export function parseTournamentResults(
    score: Event["score"],
    context: { eventId: string },
): TournamentResults {
    if (!score) return [];

    try {
        const parsed = JSON.parse(score);
        return Array.isArray(parsed) ? (parsed as TournamentResults) : [];
    } catch (error) {
        console.error("Failed to parse score JSON for event", context.eventId, error);
        return [];
    }
}

export function chunkArray<T>(items: T[], size: number): T[][] {
    const chunkLength = Number.isFinite(size) && size > 0 ? Math.floor(size) : 1;
    if (items.length === 0) return [];
    if (chunkLength === 1) return items.map((item) => [item]);

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkLength) {
        chunks.push(items.slice(index, index + chunkLength));
    }
    return chunks;
}

export function createStandingsSummary(
    results: TournamentResults,
    chunkSize = DEFAULT_STANDINGS_CHUNK_SIZE,
): StandingsSummary {
    const cumulativeStandings = buildCumulativeStandingsTimeline(results);
    const latestStandings = cumulativeStandings.at(-1) ?? [];
    const totalMatches = cumulativeStandings.length;
    const totalMatchesLabel =
        totalMatches > 0
            ? `Total of ${totalMatches} Games`
            : FALLBACK_TOTAL_MATCHES_LABEL;

    return {
        latestStandings,
        chunkedStandings: chunkArray(latestStandings, chunkSize),
        totalMatches,
        totalMatchesLabel,
        totalTeams: latestStandings.length,
    };
}

export function createMatchStandingsSummary(
    results: TournamentResults,
    matchNumber: string | number | undefined,
    options?: { chunkSize?: number },
): MatchStandingsSummary {
    const chunkSize = options?.chunkSize ?? DEFAULT_STANDINGS_CHUNK_SIZE;
    const matchPlacementsTimeline = buildMatchPlacementsTimeline(results);

    const matchNumberValue =
        typeof matchNumber === "number"
            ? matchNumber
            : typeof matchNumber === "string"
              ? Number(matchNumber)
              : Number.NaN;

    const matchIndex =
        Number.isInteger(matchNumberValue) && matchNumberValue > 0
            ? matchNumberValue - 1
            : -1;

    const hasValidMatchIndex =
        matchIndex >= 0 && matchIndex < matchPlacementsTimeline.length;

    const matchStandings = hasValidMatchIndex
        ? matchPlacementsTimeline[matchIndex] ?? []
        : [];

    const matchDisplayNumber: number | "?" = hasValidMatchIndex
        ? matchIndex + 1
        : "?";

    const headingLabel =
        typeof matchDisplayNumber === "number"
            ? `Game ${matchDisplayNumber} Result`
            : DEFAULT_MATCH_HEADING_LABEL;

    return {
        matchStandings,
        chunkedStandings: chunkArray(matchStandings, chunkSize),
        headingLabel,
        totalTeams: matchStandings.length,
        matchIndex: hasValidMatchIndex ? matchIndex : -1,
        matchDisplayNumber: hasValidMatchIndex ? matchDisplayNumber : "?",
        totalMatches: matchPlacementsTimeline.length,
    };
}
