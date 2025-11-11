"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import React from "react";

function makeClient() {
  const isProd = process.env.NODE_ENV === "production";
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: unknown) => {
        if (!isProd) console.error("RQ Query error:", error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: unknown) => {
        if (!isProd) console.error("RQ Mutation error:", error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 1000 * 30, // 30s
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

const client = makeClient();

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
