import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";

import type { Event } from "@/lib/microcms";
import type {
    CumulativeStandingEntry,
    MatchPlacementEntry,
} from "@/lib/standings";
import {
    DEFAULT_STANDINGS_CHUNK_SIZE,
    createMatchStandingsSummary,
    parseTournamentResults,
    type MatchStandingsSummary,
} from "@/lib/standings-summary";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const interactiveTagNames = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
const KEYBOARD_SHORTCUT_PATTERN = /^[1-9]$/;

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

const createMatchStandingsFetcher =
    (eventId: string, matchParam: string, chunkSize: number) =>
    async (url: string): Promise<MatchStandingsPayload> => {
        const response = await fetch(url, {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load match standings (${response.status})`);
        }

        const { event, updatedAt } = (await response.json()) as {
            event: Event;
            updatedAt?: string;
        };

        const results = parseTournamentResults(event.score, { eventId });
        const summary = createMatchStandingsSummary(results, matchParam, {
            chunkSize,
        });

        return {
            summary,
            updatedAt,
            eventTitle: event.title,
        };
    };

const formatTimestamp = (value: string | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const initializeSplide = (root: HTMLElement) => {
    const splide = new Splide(root, {
        type: "loop",
        perPage: 1,
        keyboard: "global",
        arrows: false,
        pagination: false,
        drag: false,
        rewind: true,
        speed: 1000,
        easing: "cubic-bezier(0.42, 0, 0.58, 1)",
    });

    splide.mount();

    const handleKeydown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }

        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
            if (
                interactiveTagNames.has(activeElement.tagName) ||
                activeElement.isContentEditable
            ) {
                return;
            }
        } else if (activeElement) {
            return;
        }

        if (!KEYBOARD_SHORTCUT_PATTERN.test(event.key)) {
            return;
        }

        const requestedIndex = Number(event.key);
        const slideCount = splide.Components.Slides.getLength();
        if (requestedIndex > slideCount) {
            return;
        }

        event.preventDefault();
        splide.go(requestedIndex - 1);
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
        window.removeEventListener("keydown", handleKeydown);
        splide.destroy();
    };
};

const StandingsTable = ({
    entries,
    variant,
}: {
    entries: Array<CumulativeStandingEntry | MatchPlacementEntry>;
    variant: "event" | "match";
}) => {
    const isEventSummary = variant === "event";

    return (
        <div className="flex-1 overflow-hidden">
            <table className="h-full min-w-full text-left text-sm">
                <thead className="text-lg text-foreground/60">
                    <tr>
                        <th className="px-5 py-3" />
                        {isEventSummary && <th className="px-5 py-3" />}
                        <th className="px-5 py-3" />
                        <th className="px-5 py-3" />
                        <th className="px-5 py-3 text-right whitespace-nowrap">
                            合計
                        </th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">
                            順位PT
                        </th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">
                            撃破PT
                        </th>
                        {isEventSummary && (
                            <th className="px-5 py-3 text-right whitespace-nowrap">VRs</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/10 border">
                    {entries.map((entry) => {
                        const summaryEntry = entry as CumulativeStandingEntry;
                        const matchEntry = entry as MatchPlacementEntry;
                        const placement = isEventSummary
                            ? summaryEntry.placement
                            : matchEntry.rank;
                        const rankChange = isEventSummary
                            ? summaryEntry.rankChange
                            : 0;
                        const team = entry.team;
                        const members =
                            team.members?.length > 0
                                ? team.members.join(" + ")
                                : team.playerName;
                        const score = isEventSummary
                            ? summaryEntry.totals.totalScore
                            : matchEntry.detail.score;
                        const placementScore = isEventSummary
                            ? summaryEntry.totals.placementScore
                            : matchEntry.detail.placementScore;
                        const eliminationScore = isEventSummary
                            ? summaryEntry.totals.eliminationScore
                            : matchEntry.detail.eliminationScore;
                        const vrCount = isEventSummary ? team.countVR : undefined;

                        return (
                            <tr key={entry.teamKey} className="transition hover:text-black">
                                <td className="w-26 h-full">
                                    <span className="inline-flex w-full h-full shrink-0 items-center justify-center bg-black text-5xl font-black leading-none text-white tabular-nums py-5 italic">
                                        {placement}
                                    </span>
                                </td>
                                {isEventSummary && (
                                    <td className="px-4 whitespace-nowrap h-full w-full inline-flex items-center justify-center tabular-nums text-2xl">
                                        {rankChange > 0 ? (
                                            <div className="text-emerald-700 tabular-nums">
                                                ▲ {rankChange}
                                            </div>
                                        ) : rankChange < 0 ? (
                                            <div className="text-rose-700 tabular-nums">
                                                ▼ {Math.abs(rankChange)}
                                            </div>
                                        ) : (
                                            <div className="text-black/60 tabular-nums">－</div>
                                        )}
                                    </td>
                                )}
                                <td className="px-5 py-3 text-3xl font-bold whitespace-nowrap">
                                    {team.teamName}
                                </td>
                                <td className="px-5 py-3 text-xl text-black/80 whitespace-normal truncate">
                                    {members}
                                </td>
                                <td className="px-5 py-3 text-right text-4xl font-bold tabular-nums whitespace-nowrap italic">
                                    {score}
                                </td>
                                <td className="px-5 py-3 text-right text-2xl text-black/90 tabular-nums whitespace-nowrap">
                                    {placementScore}
                                </td>
                                <td className="px-5 py-3 text-right text-2xl text-black/90 tabular-nums whitespace-nowrap">
                                    {eliminationScore}
                                </td>
                                {isEventSummary && (
                                    <td className="px-5 py-3 text-right text-2xl text-black/90 tabular-nums whitespace-nowrap">
                                        {vrCount}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const StandingsSlider = ({
    chunkedStandings,
}: {
    chunkedStandings: MatchStandingsSummary["chunkedStandings"];
}) => {
    const sliderRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = sliderRef.current;
        if (!root) return;
        if (!chunkedStandings.length) return;

        const cleanup = initializeSplide(root);

        return () => {
            cleanup?.();
        };
    }, [chunkedStandings]);

    return (
        <div ref={sliderRef} className="standings-splide splide h-full w-full">
            <div className="splide__track h-full">
                <ul className="splide__list h-full">
                    {chunkedStandings.map((chunk, index) => (
                        <li
                            key={chunk[0]?.teamKey ?? `chunk-${index}`}
                            className="splide__slide h-full"
                        >
                            <div className="flex h-full w-full flex-col">
                                <StandingsTable entries={chunk} variant="match" />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export function MatchStandingsClient({
    eventId,
    eventTitle,
    matchParam,
    initialSummary,
    initialUpdatedAt,
    refreshIntervalMs = 10_000,
    className,
}: MatchStandingsClientProps) {
    const chunkSize =
        initialSummary.chunkedStandings.at(0)?.length ??
        DEFAULT_STANDINGS_CHUNK_SIZE;

    const fetcher = useMemo(
        () => createMatchStandingsFetcher(eventId, matchParam, chunkSize),
        [eventId, matchParam, chunkSize],
    );

    const fallbackData = useMemo<MatchStandingsPayload>(
        () => ({
            summary: initialSummary,
            updatedAt: initialUpdatedAt,
            eventTitle,
        }),
        [initialSummary, initialUpdatedAt, eventTitle],
    );

    const {
        data,
        error,
        isLoading,
        isValidating,
        mutate,
    } = useSWR(`/api/events/${eventId}`, fetcher, {
        refreshInterval: refreshIntervalMs,
        revalidateOnFocus: true,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        fallbackData,
        revalidateOnMount: !fallbackData,
    });

    const { summary, updatedAt, eventTitle: latestTitle } = data ?? fallbackData;
    const { headingLabel, chunkedStandings, totalTeams } = summary;
    const lastUpdatedLabel = formatTimestamp(updatedAt);

    useEffect(() => {
        const nextTitle = `${headingLabel} - ${latestTitle}`;
        if (typeof document !== "undefined" && document.title !== nextTitle) {
            document.title = nextTitle;
        }
    }, [headingLabel, latestTitle]);

    const hasStandings = totalTeams > 0 && chunkedStandings.length > 0;

    return (
        <section
            className={cn(
                "flex min-h-dvh w-full max-w-[1440px] mx-auto flex-col p-4 text-black",
                className,
            )}
        >
            {!hasStandings ? (
                <p className="mt-2 rounded-xl border border-black/15 px-6 py-8 text-center text-black/60">
                    スコアデータが見つかりませんでした。
                </p>
            ) : (
                <>
                    <header className="mb-2 flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-black/60">
                        <span className="inline-flex min-w-28 items-center justify-center border-3 px-4 py-2 text-lg font-bold text-black tabular-nums">
                            {headingLabel}
                        </span>
                        <span className="h-0.5 flex-1 bg-border" />
                        <span className="font-bold text-lg text-foreground/90">
                            Total Teams{" "}
                            <span className="tabular-nums">{totalTeams}</span>
                        </span>
                    </header>
                    <div className="flex-1 overflow-hidden">
                        <StandingsSlider chunkedStandings={chunkedStandings} />
                    </div>
                </>
            )}
        </section>
    );
}

export default MatchStandingsClient;
