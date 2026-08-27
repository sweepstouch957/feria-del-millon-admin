"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import React, { useState } from "react";

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

/* El cliente NO puede vivir a nivel de módulo.
   En el servidor el módulo se carga una vez por proceso, así que un cliente
   compartido serviría datos cacheados de un usuario a otro y su caché crecería
   sin límite mientras el proceso viva. Patrón oficial de TanStack para el App
   Router: en servidor siempre uno nuevo por render; en el navegador, un único
   singleton reutilizado entre navegaciones. */
let browserClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeClient();
  if (!browserClient) browserClient = makeClient();
  return browserClient;
}

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // useState con inicializador perezoso: se evalúa una sola vez por montaje,
  // nunca en cada render.
  const [client] = useState(getQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
