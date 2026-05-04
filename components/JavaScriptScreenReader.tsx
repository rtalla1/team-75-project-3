"use client";

import { useState, useRef, useEffect } from "react";

interface AnnouncementQueue {
    id: string;
    message: string;
    timestamp: number;
}

export function useScreenReaderAnnounce() {
    const [announcements, setAnnouncements] = useState<AnnouncementQueue[]>([]);

    const announce = (message: string) => {
        const id = `announce-${Date.now()}-${Math.random()}`;
        const announcement: AnnouncementQueue = {
            id,
            message,
            timestamp: Date.now(),
        };

        setAnnouncements((prev) => [...prev, announcement]);

        // Remove after 4 seconds
        setTimeout(() => {
            setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        }, 4000);
    };

    return { announce, announcements };
}

export function JavaScriptScreenReader({
    announcements,
}: {
    announcements: AnnouncementQueue[];
}) {
    const [enabled, setEnabled] = useState(false);
    const lastUtteranceIdRef = useRef<string | null>(null);

    // Speak announcements using Web Speech API if available
    useEffect(() => {
        if (!enabled || announcements.length === 0) return;

        const latest = announcements[announcements.length - 1];

        // Skip if this is the same announcement we just spoke
        if (lastUtteranceIdRef.current === latest.id) return;

        lastUtteranceIdRef.current = latest.id;

        // Cancel any ongoing speech to prevent overlap
        window.speechSynthesis.cancel();

        // Small delay to ensure cancellation is processed
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(latest.message);
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }, 50);
    }, [enabled, announcements]);

    return (
        <>
            <button
                onClick={() => setEnabled(!enabled)}
                aria-label={enabled ? "Disable screen reader" : "Enable screen reader"}
                className={`px-4 py-2 rounded-lg font-sm transition ${enabled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                    }`}
            >
                {enabled ? "Screen Reader: ON" : "Screen Reader: OFF"}
            </button>
        </>
    );
}
