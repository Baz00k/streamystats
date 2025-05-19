"use client";

import { useCallback, useEffect, useState } from "react";
import { toast, useSonner } from "sonner";

interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}

export function UpdateNotifier() {
  const { toasts } = useSonner();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  // Load dismissed version from localStorage on mount
  useEffect(() => {
    const storedVersion = localStorage.getItem("dismissedUpdateVersion");
    if (storedVersion) {
      setDismissedVersion(storedVersion);
    }
  }, []);

  const notifyUserOfUpdate = useCallback(
    (newVersion: string) => {
      // Don't show notification if this version was already dismissed
      if (
        dismissedVersion === newVersion ||
        toasts.find((t) => t.id === "update-notification")
      ) {
        return;
      }

      toast.warning("New Version", {
        id: "update-notification",
        description: `A new version (${newVersion}) is available. Please update the docker images.`,
        duration: Number.POSITIVE_INFINITY,
        dismissible: true,
        cancel: (
          <button
            className="shrink-0 ml-2 hover:opacity-50"
            type="button"
            onClick={() => {
              // Save the dismissed version to localStorage
              localStorage.setItem("dismissedUpdateVersion", newVersion);
              setDismissedVersion(newVersion);
              toast.dismiss();
            }}
          >
            Dismiss
            <span className="sr-only">Dismiss</span>
          </button>
        ),
        action: (
          <button
            type="button"
            className="shrink-0 ml-2 hover:opacity-50 flex flex-row items-center gap-1"
            onClick={() => {
              // Go to latest release
              window.open(
                "https://github.com/fredrikburmester/streamystats/releases/latest",
                "_blank"
              );
              toast.dismiss();
            }}
          >
            Open
            <span className="sr-only">Open</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </button>
        ),
      });
    },
    [dismissedVersion, toasts]
  );

  useEffect(() => {
    // biome-ignore lint/style/useConst: <explanation>
    let intervalId: NodeJS.Timeout;

    // Function to check for updates
    const checkForUpdates = async () => {
      try {
        const response = await fetch("/api/version");
        const versionInfo: VersionInfo = await response.json();

        if (
          versionInfo.hasUpdate &&
          versionInfo.latestVersion !== dismissedVersion
        ) {
          notifyUserOfUpdate(versionInfo.latestVersion);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    // Check for updates every 15 minutes
    intervalId = setInterval(checkForUpdates, 15 * 60 * 1000);

    // Initial check (with a slight delay to not impact page load)
    setTimeout(checkForUpdates, 1000);

    return () => clearInterval(intervalId);
  }, [notifyUserOfUpdate, dismissedVersion]);

  return null;
}
