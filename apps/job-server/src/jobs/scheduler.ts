import * as cron from "node-cron";
import { db, servers, jobResults } from "@streamystats/database";
import { eq, and, sql } from "drizzle-orm";
import { getJobQueue } from "./queue";
import { JELLYFIN_JOB_NAMES } from "../jellyfin/workers";

class SyncScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private enabled: boolean = false;
  private activitySyncInterval: string = "*/5 * * * *"; // Every 5 minutes
  private recentItemsSyncInterval: string = "*/5 * * * *"; // Every 15 minutes
  private jobCleanupInterval: string = "*/5 * * * *"; // Every 5 minutes

  constructor() {
    // Auto-start if not explicitly disabled
    const autoStart = process.env.SCHEDULER_AUTO_START !== "false";
    if (autoStart) {
      this.start();
    }
  }

  /**
   * Start the scheduler with current configuration
   */
  start(): void {
    if (this.enabled) {
      console.log("Scheduler is already running");
      return;
    }

    this.enabled = true;

    try {
      // Activity sync task
      const activityTask = cron.schedule(this.activitySyncInterval, () => {
        this.triggerActivitySync().catch((error) => {
          console.error("Error during scheduled activity sync:", error);
        });
      });

      // Recent items sync task
      const recentItemsTask = cron.schedule(
        this.recentItemsSyncInterval,
        () => {
          this.triggerRecentItemsSync().catch((error) => {
            console.error("Error during scheduled recent items sync:", error);
          });
        }
      );

      // Job cleanup task for stale embedding jobs
      const jobCleanupTask = cron.schedule(this.jobCleanupInterval, () => {
        this.triggerJobCleanup().catch((error) => {
          console.error("Error during scheduled job cleanup:", error);
        });
      });

      this.scheduledTasks.set("activity-sync", activityTask);
      this.scheduledTasks.set("recent-items-sync", recentItemsTask);
      this.scheduledTasks.set("job-cleanup", jobCleanupTask);

      // Start all tasks
      activityTask.start();
      recentItemsTask.start();
      jobCleanupTask.start();

      console.log("Scheduler started successfully");
      console.log(`Activity sync: ${this.activitySyncInterval}`);
      console.log(`Recent items sync: ${this.recentItemsSyncInterval}`);
      console.log(`Job cleanup: ${this.jobCleanupInterval}`);
    } catch (error) {
      console.error("Failed to start scheduler:", error);
      this.enabled = false;
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.enabled) {
      console.log("Scheduler is not running");
      return;
    }

    // Stop and clear all scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      try {
        task.stop();
        task.destroy();
        console.log(`Stopped scheduled task: ${name}`);
      } catch (error) {
        console.error(`Error stopping task ${name}:`, error);
      }
    }

    this.scheduledTasks.clear();
    this.enabled = false;
    console.log("Scheduler stopped");
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: {
    enabled?: boolean;
    activitySyncInterval?: string;
    recentItemsSyncInterval?: string;
    jobCleanupInterval?: string;
  }): void {
    const wasEnabled = this.enabled;

    if (config.activitySyncInterval) {
      this.activitySyncInterval = config.activitySyncInterval;
    }

    if (config.recentItemsSyncInterval) {
      this.recentItemsSyncInterval = config.recentItemsSyncInterval;
    }

    if (config.jobCleanupInterval) {
      this.jobCleanupInterval = config.jobCleanupInterval;
    }

    if (config.enabled !== undefined && config.enabled !== this.enabled) {
      if (config.enabled) {
        this.start();
      } else {
        this.stop();
      }
    } else if (wasEnabled && this.enabled) {
      // Restart with new configuration if it was running
      this.stop();
      this.start();
    }
  }

  /**
   * Trigger activity sync for all active servers
   */
  private async triggerActivitySync(): Promise<void> {
    try {
      console.log("Triggering periodic activity sync...");

      // Get all servers that are not currently syncing
      const activeServers = await db
        .select()
        .from(servers)
        .where(eq(servers.syncStatus, "completed"));

      if (activeServers.length === 0) {
        console.log("No active servers found for activity sync");
        return;
      }

      const boss = await getJobQueue();

      // Queue activity sync jobs for each server
      for (const server of activeServers) {
        try {
          await boss.send(
            JELLYFIN_JOB_NAMES.RECENT_ACTIVITIES_SYNC,
            {
              serverId: server.id,
              options: {
                activityOptions: {
                  limit: 100, // Default limit
                },
              },
            },
            {
              expireInMinutes: 30, // Job expires after 30 minutes
              retryLimit: 1, // Retry once if it fails
              retryDelay: 60, // Wait 60 seconds before retrying
            }
          );

          console.log(
            `Queued periodic activity sync for server: ${server.name} (ID: ${server.id})`
          );
        } catch (error) {
          console.error(
            `Failed to queue activity sync for server ${server.name}:`,
            error
          );
        }
      }

      console.log(
        `Periodic activity sync queued for ${activeServers.length} servers`
      );
    } catch (error) {
      console.error("Error during periodic activity sync trigger:", error);
    }
  }

  /**
   * Trigger recently added items sync for all active servers
   */
  private async triggerRecentItemsSync(): Promise<void> {
    try {
      console.log("Triggering periodic recently added items sync...");

      // Get all servers that are not currently syncing
      const activeServers = await db
        .select()
        .from(servers)
        .where(eq(servers.syncStatus, "completed"));

      if (activeServers.length === 0) {
        console.log("No active servers found for recently added items sync");
        return;
      }

      const boss = await getJobQueue();

      // Queue recently added items sync jobs for each server
      for (const server of activeServers) {
        try {
          await boss.send(
            JELLYFIN_JOB_NAMES.RECENT_ITEMS_SYNC,
            {
              serverId: server.id,
              options: {
                itemOptions: {
                  recentItemsLimit: 100, // Default limit
                },
              },
            },
            {
              expireInMinutes: 30, // Job expires after 30 minutes
              retryLimit: 1, // Retry once if it fails
              retryDelay: 60, // Wait 60 seconds before retrying
            }
          );

          console.log(
            `Queued periodic recently added items sync for server: ${server.name} (ID: ${server.id})`
          );
        } catch (error) {
          console.error(
            `Failed to queue recently added items sync for server ${server.name}:`,
            error
          );
        }
      }

      console.log(
        `Periodic recently added items sync queued for ${activeServers.length} servers`
      );
    } catch (error) {
      console.error(
        "Error during periodic recently added items sync trigger:",
        error
      );
    }
  }

  /**
   * Trigger cleanup of stale embedding jobs
   */
  private async triggerJobCleanup(): Promise<void> {
    try {
      // Find all processing embedding jobs older than 10 minutes
      const staleJobs = await db
        .select()
        .from(jobResults)
        .where(
          and(
            eq(jobResults.jobName, "generate-item-embeddings"),
            eq(jobResults.status, "processing"),
            sql`${jobResults.createdAt} < NOW() - INTERVAL '10 minutes'`
          )
        );

      let cleanedCount = 0;

      for (const staleJob of staleJobs) {
        try {
          const result = staleJob.result as any;
          const serverId = result?.serverId;

          if (serverId) {
            // Check if there's been recent heartbeat activity
            const lastHeartbeat = result?.lastHeartbeat
              ? new Date(result.lastHeartbeat).getTime()
              : new Date(staleJob.createdAt).getTime();
            const heartbeatAge = Date.now() - lastHeartbeat;

            // Only cleanup if no recent heartbeat (older than 2 minutes)
            if (heartbeatAge > 2 * 60 * 1000) {
              await db.insert(jobResults).values({
                jobId: `cleanup-${serverId}-${Date.now()}`,
                jobName: "generate-item-embeddings",
                status: "failed",
                result: {
                  serverId,
                  error: "Job cleanup - exceeded maximum processing time",
                  cleanedAt: new Date().toISOString(),
                  originalJobId: staleJob.jobId,
                  staleDuration: heartbeatAge,
                },
                processingTime:
                  Date.now() - new Date(staleJob.createdAt).getTime(),
                error: "Job exceeded maximum processing time without heartbeat",
              });

              cleanedCount++;
              console.log(
                `Cleaned up stale embedding job for server ${serverId}`
              );
            }
          }
        } catch (error) {
          console.error("Error cleaning up stale job:", staleJob.jobId, error);
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `Job cleanup completed: cleaned ${cleanedCount} stale embedding jobs`
        );
      }
    } catch (error) {
      console.error("Error during job cleanup:", error);
    }
  }

  /**
   * Manually trigger activity sync for a specific server
   */
  async triggerServerActivitySync(
    serverId: number,
    limit: number = 100
  ): Promise<void> {
    try {
      const boss = await getJobQueue();

      await boss.send(
        JELLYFIN_JOB_NAMES.RECENT_ACTIVITIES_SYNC,
        {
          serverId,
          options: {
            activityOptions: {
              limit,
            },
          },
        },
        {
          expireInMinutes: 30, // Job expires after 30 minutes
          retryLimit: 1, // Retry once if it fails
          retryDelay: 60, // Wait 60 seconds before retrying
        }
      );

      console.log(
        `Manual activity sync queued for server ID: ${serverId} (limit: ${limit})`
      );
    } catch (error) {
      console.error(
        `Failed to queue manual activity sync for server ${serverId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Manually trigger recently added items sync for a specific server
   */
  async triggerServerRecentItemsSync(
    serverId: number,
    limit: number = 100
  ): Promise<void> {
    try {
      const boss = await getJobQueue();

      await boss.send(
        JELLYFIN_JOB_NAMES.RECENT_ITEMS_SYNC,
        {
          serverId,
          options: {
            itemOptions: {
              recentItemsLimit: limit,
            },
          },
        },
        {
          expireInMinutes: 30, // Job expires after 30 minutes
          retryLimit: 1, // Retry once if it fails
          retryDelay: 60, // Wait 60 seconds before retrying
        }
      );

      console.log(
        `Manual recently added items sync queued for server ID: ${serverId} (limit: ${limit})`
      );
    } catch (error) {
      console.error(
        `Failed to queue manual recently added items sync for server ${serverId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      activitySyncInterval: this.activitySyncInterval,
      recentItemsSyncInterval: this.recentItemsSyncInterval,
      jobCleanupInterval: this.jobCleanupInterval,
      runningTasks: Array.from(this.scheduledTasks.keys()),
      healthCheck: this.enabled,
    };
  }
}

// Export singleton instance
export const activityScheduler = new SyncScheduler();
