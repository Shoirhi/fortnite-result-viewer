import Splide from "@splidejs/splide";

const interactiveTagNames = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
const KEYBOARD_SHORTCUT_PATTERN = /^[1-9]$/;

type InstanceRecord = {
    splide: Splide;
    handleKeydown: (event: KeyboardEvent) => void;
};

const instanceRegistry = new WeakMap<HTMLElement, InstanceRecord>();

const destroyInstance = (root: Element | null) => {
    if (!(root instanceof HTMLElement)) return;

    const record = instanceRegistry.get(root);
    if (!record) return;

    window.removeEventListener("keydown", record.handleKeydown);
    record.splide.destroy();
    instanceRegistry.delete(root);
};

const initializeInstance = (root: Element | null) => {
    if (!(root instanceof HTMLElement)) {
        return;
    }

    destroyInstance(root);

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
    instanceRegistry.set(root, { splide, handleKeydown });
};

const initializeAll = () => {
    document.querySelectorAll<HTMLElement>(".standings-splide").forEach((root) => {
        initializeInstance(root);
    });
};

const destroyAll = () => {
    document.querySelectorAll<HTMLElement>(".standings-splide").forEach((root) => {
        destroyInstance(root);
    });
};

const registerEventListeners = () => {
    document.addEventListener("astro:page-load", initializeAll);
    document.addEventListener("standings:after-update", initializeAll);
    document.addEventListener("standings:before-update", destroyAll);
    document.addEventListener("astro:before-swap", destroyAll);
};

export default function initStandingsSlider() {
    initializeAll();
    registerEventListeners();
}

initStandingsSlider();
