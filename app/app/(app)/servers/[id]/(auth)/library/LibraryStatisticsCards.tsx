"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryParams } from "@/hooks/useQueryParams";
import { type LibraryStatistics } from "@/lib/db";
import { Film, Folder, PlaySquare, Tv, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Props {
  data: LibraryStatistics;
}

// Define the filter types explicitly with their proper singular forms
type FilterType = "Movie" | "Episode" | "Series" | null;

// Define our stats items with proper filter values
interface StatItem {
  title: string;
  value: number;
  icon: React.ElementType;
  filterable: boolean;
  filterValue: FilterType;
}

export const LibraryStatisticsCards: React.FC<Props> = ({ data }) => {
  const { updateQueryParams } = useQueryParams();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") as FilterType;

  const stats: StatItem[] = [
    {
      title: "Movies",
      value: data.movies_count,
      icon: Film,
      filterable: true,
      filterValue: "Movie",
    },
    {
      title: "Episodes",
      value: data.episodes_count,
      icon: PlaySquare,
      filterable: true,
      filterValue: "Episode",
    },
    {
      title: "Series",
      value: data.series_count,
      icon: Tv,
      filterable: true,
      filterValue: "Series",
    },
    {
      title: "Libraries",
      value: data.libraries_count,
      icon: Folder,
      filterable: false,
      filterValue: null,
    },
    {
      title: "Users",
      value: data.users_count,
      icon: Users,
      filterable: false,
      filterValue: null,
    },
  ];

  const handleFilter = (filterValue: FilterType) => {
    if (!filterValue) return;

    // If the same filter is clicked again, clear it
    if (currentType === filterValue) {
      updateQueryParams({ type: null });
    } else {
      updateQueryParams({ type: filterValue });
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 md:pr-64 xl:pr-0">
      {stats.map((item) => {
        const isActive = item.filterable && item.filterValue === currentType;

        return (
          <Card
            key={item.title}
            className={`${
              item.filterable ? "cursor-pointer hover:bg-muted" : ""
            } 
                      ${isActive ? "border-primary bg-primary/10" : ""}`}
            onClick={() => {
              if (item.filterable) {
                handleFilter(item.filterValue);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <item.icon
                className={`h-4 w-4 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(item.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/**
 * Adds spaces 1000s separator to a number.
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
