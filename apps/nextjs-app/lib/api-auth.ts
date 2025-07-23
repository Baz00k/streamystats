"use server";

import { NextRequest } from "next/server";
import { Server } from "@streamystats/database";

/**
 * Validates API key from Authorization header against the actual Jellyfin server
 * Expected format: "Bearer <api-key>" or just "<api-key>"
 */
export async function validateApiKey({
  request,
  server,
}: {
  request: NextRequest;
  server: Server;
}): Promise<boolean> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  // Extract API key from Authorization header
  let apiKey: string;
  if (authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.replace("Bearer ", "");
  } else {
    apiKey = authHeader;
  }

  try {
    // Validate the API key by making a request to the Jellyfin server
    // Use /Users/Me endpoint which requires valid authentication
    try {
      const response = await fetch(`${server.url}/System/Info`, {
        method: "GET",
        headers: {
          "X-Emby-Token": apiKey,
          "Content-Type": "application/json",
        },
        // Short timeout to avoid hanging requests
        signal: AbortSignal.timeout(5000),
      });

      console.log("response", response);

      // If the request succeeds, the API key is valid
      if (response.ok) {
        return true;
      }

      // If we get 401, the API key is invalid
      if (response.status === 401) {
        console.warn(
          `Invalid API key for server ${server.name} (${server.url})`
        );
        return false;
      }

      // For other errors (500s, etc.), we consider it a server issue but invalid auth
      console.error(
        `Jellyfin server error during API key validation: ${response.status} ${response.statusText}`
      );
      return false;
    } catch (fetchError) {
      // Handle network errors, timeouts, etc.
      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          console.error(`Timeout validating API key for server ${server.name}`);
        } else if (
          fetchError.message.includes("ECONNREFUSED") ||
          fetchError.message.includes("ENOTFOUND")
        ) {
          console.error(
            `Cannot connect to Jellyfin server ${server.name} (${server.url})`
          );
        } else {
          console.error(
            `Network error validating API key for server ${server.name}:`,
            fetchError.message
          );
        }
      }
      return false;
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}

/**
 * Middleware helper to check API key authentication for a specific server
 * Returns null if valid, Response object if invalid
 */
export async function requireApiKey({
  request,
  server,
}: {
  request: NextRequest;
  server: Server;
}): Promise<Response | null> {
  const isValid = await validateApiKey({ request, server });

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message:
          "Valid API key required in Authorization header. The API key must be valid for the specified Jellyfin server.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  return null;
}
