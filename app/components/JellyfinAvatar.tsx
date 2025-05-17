import { User } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Props {
  user: User | { id: string | number; name: string | null; jellyfin_id: string | null };
  serverUrl?: string;
  imageTag?: string;
  quality?: number;
  className?: string;
}

export default function JellyfinAvatar({
  user,
  serverUrl,
  imageTag,
  quality = 90,
  className,
}: Props) {
  const imageUrl = useMemo(() => {
    if (!serverUrl || !user?.jellyfin_id) return null;

    return `${serverUrl}/Users/${user.jellyfin_id}/Images/Primary?quality=${quality}${
      imageTag ? `&tag=${imageTag}` : ""
    }`;
  }, [serverUrl, user?.jellyfin_id, imageTag, quality]);

  const initials = useMemo(() => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  if (!serverUrl || !user) return null;

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={imageUrl || undefined} alt={user.name || "User"} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
