"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/lib/db";
import { Filter } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface UserLeaderboardFilterProps {
  users: User[];
  hiddenUsers: string[];
  setHiddenUsers: Dispatch<SetStateAction<string[]>>;
}

export function UserLeaderboardFilter({
  users,
  hiddenUsers,
  setHiddenUsers,
}: UserLeaderboardFilterProps) {
  const toggleUserVisibility = (userId: string) => {
    setHiddenUsers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const resetFilters = () => {
    setHiddenUsers([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter</span>
          {hiddenUsers.length > 0 && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-xs">
              {hiddenUsers.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Hidden Users</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuCheckboxItem
            key={user.id}
            checked={!hiddenUsers.includes(user.id)}
            onCheckedChange={() => toggleUserVisibility(user.id)}
          >
            {user.name}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={resetFilters}
            disabled={hiddenUsers.length === 0}
          >
            Reset Filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
