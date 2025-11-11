"use client";

import { useQuery } from "@tanstack/react-query";
import { listEvents, type EventDoc } from "@services/events.service";

export function useEvents() {
  return useQuery<EventDoc[]>({
    queryKey: ["events"],
    queryFn: () => listEvents({ status: "active" }),
    staleTime: 5 * 60 * 1000,
  });
}