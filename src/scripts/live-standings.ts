const POLL_INTERVAL_MS = 10_000;
const STANDINGS_ROOT_SELECTOR = "#standings-root";
const PAGE_REQUEST_HEADERS = { "X-Standings-Refresh": "1" };

type StandingsRoot = HTMLElement & {
    dataset: DOMStringMap & { eventId?: string; updatedAt?: string };
};

const getStandingsRoot = (): StandingsRoot | null => {
    const root = document.querySelector(STANDINGS_ROOT_SELECTOR);
    return root instanceof HTMLElement ? (root as StandingsRoot) : null;
};

const initialRoot = getStandingsRoot();

if (!initialRoot) {
    console.warn("Standings root element not found; live updates disabled.");
} else {
    const eventId = initialRoot.dataset.eventId ?? "";
    if (!eventId) {
        console.warn("Event ID missing on standings root; live updates disabled.");
    } else {
        let latestUpdatedAt = initialRoot.dataset.updatedAt ?? "";
        let pollTimerId: number | undefined;
        let isActive = true;
        let isUpdating = false;

        const scheduleNextPoll = () => {
            if (!isActive) return;
            window.clearTimeout(pollTimerId);
            pollTimerId = window.setTimeout(pollForUpdates, POLL_INTERVAL_MS);
        };

        const fetchAndSwapStandings = async (nextUpdatedAt: string) => {
            const currentRoot = getStandingsRoot();
            if (!currentRoot) return;

            isUpdating = true;
            document.dispatchEvent(new CustomEvent("standings:before-update"));

            try {
                const response = await fetch(
                    window.location.pathname + window.location.search,
                    {
                        cache: "no-store",
                        headers: {
                            ...PAGE_REQUEST_HEADERS,
                            Pragma: "no-cache",
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch latest standings markup (${response.status})`,
                    );
                }

                const html = await response.text();
                const parser = new DOMParser();
                const nextDocument = parser.parseFromString(html, "text/html");
                const nextRoot = nextDocument.querySelector(STANDINGS_ROOT_SELECTOR);

                if (!(nextRoot instanceof HTMLElement)) {
                    throw new Error("Could not find standings root in refreshed markup.");
                }

                currentRoot.replaceWith(nextRoot);

                const liveRoot = getStandingsRoot();

                const nextTitle = nextDocument.querySelector("title")?.textContent?.trim();
                if (nextTitle) {
                    document.title = nextTitle;
                }

                if (liveRoot) {
                    liveRoot.dataset.updatedAt = nextUpdatedAt;
                }

                document.dispatchEvent(new CustomEvent("standings:after-update"));

                latestUpdatedAt = nextUpdatedAt || latestUpdatedAt;
            } catch (error) {
                console.error("Applying live standings update failed", error);
                window.location.reload();
            } finally {
                isUpdating = false;
            }
        };

        const pollForUpdates = async () => {
            if (!isActive) return;
            if (isUpdating) {
                scheduleNextPoll();
                return;
            }

            try {
                const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`, {
                    cache: "no-store",
                    headers: {
                        Pragma: "no-cache",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const payload = (await response.json()) as { updatedAt?: string };
                const updatedAt = payload?.updatedAt ?? "";

                if (updatedAt && latestUpdatedAt && updatedAt !== latestUpdatedAt) {
                    await fetchAndSwapStandings(updatedAt);
                } else {
                    latestUpdatedAt = updatedAt || latestUpdatedAt;
                }
            } catch (error) {
                console.warn("Polling for microCMS updates failed", error);
            } finally {
                scheduleNextPoll();
            }
        };

        document.addEventListener("visibilitychange", () => {
            const shouldRun = !document.hidden;
            if (shouldRun && !isActive) {
                isActive = true;
                pollForUpdates();
            } else if (!shouldRun && isActive) {
                isActive = false;
                window.clearTimeout(pollTimerId);
            }
        });

        document.addEventListener(
            "astro:before-swap",
            () => {
                isActive = false;
                window.clearTimeout(pollTimerId);
            },
            { once: true },
        );

        pollForUpdates();
    }
}
