"use client";

import { ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "./Spinner";
import JellyfinAvatar from "./JellyfinAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SidebarMenuButton } from "./ui/sidebar";
import { User } from "@streamystats/database";
import { logout } from "@/lib/db/users";

interface Props {
  me?: User;
  serverUrl?: string;
}

export const UserMenu: React.FC<Props> = ({ me, serverUrl }) => {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);

  const { id } = params as { id: string };

  if (!me || !me?.name) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <JellyfinAvatar
            user={me}
            serverUrl={serverUrl}
            className="h-8 w-8 rounded-lg"
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{me.name}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <JellyfinAvatar
              user={me}
              serverUrl={serverUrl}
              className="h-8 w-8 rounded-lg"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{me.name}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuGroup>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup> */}
        {/* <DropdownMenuSeparator /> */}
        <DropdownMenuItem
          onClick={async () => {
            setLoading(true);
            // Handle logout by removing cookie from server
            // Redirect to login page
            await logout();
            toast.success("Logged out successfully");
            router.push(`/servers/${id}/login`);
            setLoading(false);
          }}
        >
          <LogOut />
          {loading ? <Spinner /> : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
