  // hooks/queries/useCities.ts
  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { CityDoc, listCities } from "@services/city.service";
  import { useQuery } from "@tanstack/react-query";

  export const CITIES_QUERY_KEY = ["catalog", "cities"];

  export function useCities() {
    return useQuery<CityDoc[]>({
      queryKey: CITIES_QUERY_KEY,
      queryFn: listCities,
      staleTime: 1000 * 60 * 60, // 1 hora (las ciudades casi no cambian)
    });
  }
