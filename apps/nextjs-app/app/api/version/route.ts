import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VersionResponse = {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  buildTime?: number;
};

export async function GET(_req: NextRequest) {
  const currentVersion = process.env.NEXT_PUBLIC_VERSION || "latest";
  const currentSha = process.env.NEXT_PUBLIC_COMMIT_SHA?.substring(0, 7) || "";
  const buildTime = Number.parseInt(
    process.env.NEXT_PUBLIC_BUILD_TIME || "0",
    10
  );

  let latestVersion = currentVersion;
  let latestSha = currentSha;
  let hasUpdate = false;

  try {
    // Fetch latest release version
    const releaseRes = await fetch(
      "https://api.github.com/repos/fredrikburmester/streamystats/releases/latest",
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 60 },
      }
    );

    if (releaseRes.ok) {
      const data = await releaseRes.json();
      latestVersion = data.tag_name || latestVersion;
    }

    // Fetch latest commit SHA if on edge
    if (currentVersion === "latest") {
      const commitRes = await fetch(
        "https://api.github.com/repos/fredrikburmester/streamystats/commits/main",
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 60 },
        }
      );

      if (commitRes.ok) {
        const data = await commitRes.json();
        latestSha = data.sha.substring(0, 7);
        hasUpdate = currentSha !== latestSha;
      }
    } else if (latestVersion !== "latest") {
      // Compare semantic versions if not on latest
      hasUpdate = compareVersions(currentVersion, latestVersion) < 0;
    }

    return new Response(
      JSON.stringify({
        currentVersion:
          currentVersion === "latest" ? currentSha : currentVersion,
        latestVersion: currentVersion === "latest" ? latestSha : latestVersion,
        hasUpdate,
        buildTime,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error checking version:", err);
    return new Response(
      JSON.stringify({
        currentVersion,
        latestVersion: "",
        hasUpdate: false,
        buildTime,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Simple semantic version comparator
function compareVersions(a: string, b: string): number {
  const stripV = (v: string) => (v.startsWith("v") ? v.slice(1) : v);
  const toParts = (v: string) => stripV(v).split(".").map(Number);
  const [aParts, bParts] = [toParts(a), toParts(b)];

  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}
