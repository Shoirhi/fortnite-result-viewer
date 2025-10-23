import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";

import type { EventSummary } from "@/lib/microcms";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EventsResponse = {
    events: EventSummary[];
    fetchedAt: string;
};

type EventsListProps = {
    initialEvents?: EventSummary[];
    initialFetchedAt?: string;
    refreshIntervalMs?: number;
    className?: string;
};

const DEFAULT_REFRESH_INTERVAL_MS = 10_000;

const eventsFetcher = async (url: string): Promise<EventsResponse> => {
    const response = await fetch(url, {
        cache: "no-store",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
    }

    return (await response.json()) as EventsResponse;
};

export function EventsList({
    initialEvents = [],
    initialFetchedAt,
    refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
    className,
}: EventsListProps) {
    const { mutate } = useSWRConfig();
    const fallbackData = useMemo<EventsResponse | undefined>(() => {
        if (!initialEvents.length) return undefined;
        return {
            events: initialEvents,
            fetchedAt: initialFetchedAt ?? "",
        };
    }, [initialEvents, initialFetchedAt]);

    const {
        data,
        error,
        isLoading,
        isValidating,
    } = useSWR<EventsResponse>("/api/events", eventsFetcher, {
        refreshInterval: refreshIntervalMs,
        revalidateOnFocus: true,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        fallbackData,
        // If we already have fallback data there's no need to re-fetch immediately.
        revalidateOnMount: !fallbackData,
    });

    const events = data?.events ?? [];
    const lastFetchedAt = data?.fetchedAt ?? fallbackData?.fetchedAt ?? "";

    if (error) {
        return (
            <div className={cn("space-y-2", className)}>
                <p className="text-sm text-destructive">
                    最新のイベント一覧を取得できませんでした。
                </p>
                <button
                    type="button"
                    onClick={() => {
                        void mutate("/api/events");
                    }}
                    className={buttonVariants({ variant: "secondary" })}
                >
                    リロード
                </button>
            </div>
        );
    }

    if (!events.length && isLoading) {
        return (
            <div className={cn("space-y-2", className)}>
                <p className="text-sm text-muted-foreground">イベントを読み込み中...</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-col items-start gap-y-1">
                {events.length ? (
                    events.map((event) => (
                        <a
                            key={event.id}
                            href={`/event/${event.id}`}
                            className={buttonVariants({ variant: "secondary" })}
                        >
                            {event.title}
                        </a>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">
                        現在利用できるイベントはありません。
                    </p>
                )}
            </div>
        </div>
    );
}

export default EventsList;
