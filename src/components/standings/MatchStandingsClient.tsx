import { useEffect, useMemo } from "react";
import useSWR from "swr";

import type { Event } from "@/lib/microcms";
import type { MatchPlacementEntry } from "@/lib/standings";
import {
    createMatchStandingsSummary,
    parseTournamentResults,
    type MatchStandingsSummary,
} from "@/lib/standings-summary";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type MatchStandingsPayload = {
    summary: MatchStandingsSummary;
    updatedAt?: string;
    eventTitle: string;
};

type MatchStandingsClientProps = {
    eventId: string;
    eventTitle: string;
    matchParam: string;
    initialSummary: MatchStandingsSummary;
    initialUpdatedAt?: string;
    refreshIntervalMs?: number;
    className?: string;
};

const TOP_LIMIT = 10;

const createMatchStandingsFetcher =
    (eventId: string, matchParam: string) => async (url: string) => {
        const response = await fetch(url, {
            cache: "no-store",
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new Error(`Failed to load match standings (${response.status})`);
        }

        const { event, updatedAt } = (await response.json()) as {
            event: Event;
            updatedAt?: string;
        };

        const results = parseTournamentResults(event.score, { eventId });
        const summary = createMatchStandingsSummary(results, matchParam);

        return {
            summary,
            updatedAt,
            eventTitle: event.title,
        };
    };

const StandingsTable = ({ standings }: { standings: MatchPlacementEntry[] }) => (
    <div className="flex-1 overflow-hidden">
        <table className="h-full min-w-full text-left text-sm">
            <thead className="text-lg text-foreground/60">
                <tr>
                    <th className="px-5 py-3" />
                    <th className="px-5 py-3" />
                    <th className="px-5 py-3" />
                    <th className="px-5 py-3 text-right whitespace-nowrap">合計</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">順位PT</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">撃破PT</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-black/10 border">
                {standings.map((entry) => {
                    const team = entry.team;
                    const members =
                        team.members?.length > 0
                            ? team.members.join(" + ")
                            : team.playerName;
                    const detail = entry.detail;

                    return (
                        <tr key={entry.teamKey} className="transition hover:text-black">
                            <td className="w-26 h-full">
                                <span className="inline-flex w-full h-full shrink-0 items-center justify-center bg-black text-5xl font-black leading-none text-white tabular-nums py-5 italic">
                                    {entry.rank}
                                </span>
                            </td>
                            <td className="px-5 py-3 text-3xl font-bold whitespace-nowrap">
                                {team.teamName}
                            </td>
                            <td className="px-5 py-3 text-xl text-black/80 whitespace-normal truncate">
                                {members}
                            </td>
                            <td className="px-5 py-3 text-right text-4xl font-bold tabular-nums whitespace-nowrap italic">
                                {detail.score}
                            </td>
                            <td className="px-5 py-3 text-right text-2xl text-black/90 tabular-nums whitespace-nowrap">
                                {detail.placementScore}
                            </td>
                            <td className="px-5 py-3 text-right text-2xl text-black/90 tabular-nums whitespace-nowrap">
                                {detail.eliminationScore}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

export function MatchStandingsClient({
    eventId,
    eventTitle,
    matchParam,
    initialSummary,
    initialUpdatedAt,
    refreshIntervalMs = 10_000,
    className,
}: MatchStandingsClientProps) {
    const fetcher = useMemo(
        () => createMatchStandingsFetcher(eventId, matchParam),
        [eventId, matchParam],
    );

    const fallbackData = useMemo<MatchStandingsPayload>(
        () => ({
            summary: initialSummary,
            updatedAt: initialUpdatedAt,
            eventTitle,
        }),
        [initialSummary, initialUpdatedAt, eventTitle],
    );

    const { data, error, isLoading, isValidating, mutate } = useSWR<MatchStandingsPayload>(
        `/api/events/${eventId}`,
        fetcher,
        {
            refreshInterval: refreshIntervalMs,
            revalidateOnFocus: true,
            revalidateIfStale: true,
            revalidateOnReconnect: true,
            fallbackData,
            revalidateOnMount: false,
        },
    );

    const { summary, eventTitle: latestTitle } = data ?? fallbackData;
    const { headingLabel, matchStandings, totalTeams } = summary;
    const visibleStandings = matchStandings.slice(0, TOP_LIMIT);
    const hasStandings = matchStandings.length > 0;
    const startPlacement = hasStandings ? 1 : 0;
    const endPlacement = hasStandings
        ? Math.min(TOP_LIMIT, matchStandings.length)
        : 0;
    const placementRangeLabel = `${startPlacement}位〜${endPlacement}位`;

    useEffect(() => {
        const nextTitle = `${headingLabel} - ${latestTitle}`;
        if (typeof document !== "undefined" && document.title !== nextTitle) {
            document.title = nextTitle;
        }
    }, [headingLabel, latestTitle]);

    return (
        <section
            className={cn(
                "flex min-h-dvh w-full max-w-[1440px] mx-auto flex-col p-4 text-black",
                className,
            )}
        >
            <header className="mb-2 flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-black/60">
                <span className="inline-flex min-w-28 items-center justify-center border-3 px-4 py-2 text-lg font-bold text-black tabular-nums">
                    {headingLabel}
                </span>
                <span className="h-0.5 flex-1 bg-border" />
                <div className="flex items-center gap-4 text-lg font-bold text-foreground/90">
                    <span className="tabular-nums">{placementRangeLabel}</span>
                    <span>
                        Total Teams{" "}
                        <span className="tabular-nums">{totalTeams}</span>
                    </span>
                </div>
            </header>
            {!hasStandings ? (
                <p className="mt-2 rounded-xl border border-black/15 px-6 py-8 text-center text-black/60">
                    スコアデータが見つかりませんでした。
                </p>
            ) : (
                <StandingsTable standings={visibleStandings} />
            )}
        </section>
    );
}

export default MatchStandingsClient;
