"use client";

import { Poster } from "@/app/(app)/servers/[id]/(auth)/dashboard/Poster";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDuration } from "@/lib/utils";
import { Item, Server } from "@streamystats/database/schema";
import { Clock, Sparkles } from "lucide-react";
import Link from "next/link";

interface RecommendationItem {
  item: Item;
  similarity: number;
  basedOn: Item[];
}

interface SimilarItemsProps {
  items: RecommendationItem[];
  server: Server;
  currentItemType: string;
}

function formatRuntime(runtimeTicks: number): string {
  // Convert ticks to milliseconds (1 tick = 100 nanoseconds)
  const milliseconds = runtimeTicks / 10000;
  return formatDuration(Math.round(milliseconds / 1000));
}

export function SimilarItemsList({
  items,
  server,
  currentItemType,
}: SimilarItemsProps) {
  if (items.length === 0) {
    return null;
  }

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case "Series":
        return "Similar Series";
      case "Movie":
        return "Similar Movies";
      case "Episode":
        return "Similar Episodes";
      default:
        return "Similar Items";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {getItemTypeLabel(currentItemType)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {items.map((recommendation) => {
              const { item } = recommendation;
              return (
                <Link
                  key={item.id}
                  href={`/servers/${server.id}/library/${item.id}`}
                  className="flex-shrink-0 group"
                >
                  <div className="w-[200px] sm:w-[240px] flex flex-col overflow-hidden border border-border bg-card rounded-lg hover:shadow-lg transition-all duration-200">
                    {/* Poster */}
                    <div className="relative">
                      <Poster
                        item={item}
                        server={server}
                        width={240}
                        height={360}
                        preferredImageType="Primary"
                        className="w-full h-48 sm:h-56 rounded-t-lg"
                      />

                      {/* Similarity score overlay */}
                      {recommendation.similarity > 0.8 && (
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="default"
                            className="text-xs bg-green-600"
                          >
                            {Math.round(recommendation.similarity * 100)}% match
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3 space-y-2">
                      {/* Title */}
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>

                      {/* Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {item.productionYear && (
                            <span>{item.productionYear}</span>
                          )}
                          {item.runtimeTicks && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRuntime(item.runtimeTicks)}
                            </div>
                          )}
                        </div>

                        {/* Episode info for episodes */}
                        {item.type === "Episode" && (
                          <div className="text-xs text-muted-foreground">
                            {item.seriesName && (
                              <div className="line-clamp-1">
                                {item.seriesName}
                              </div>
                            )}
                            <div className="flex gap-2">
                              {item.seasonName && (
                                <span>{item.seasonName}</span>
                              )}
                              {item.indexNumber && (
                                <span>Ep. {item.indexNumber}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Type badge */}
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                          {item.communityRating && (
                            <div className="text-xs text-muted-foreground">
                              ⭐ {item.communityRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Genres */}
                      {item.genres && item.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.genres.slice(0, 2).map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              {genre}
                            </Badge>
                          ))}
                          {item.genres.length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              +{item.genres.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
