"use client";

import { useEffect, useState } from "react";
import { searchArtists } from "@services/users.service";

export type ArtistOption = {
  id: string;
  email: string;
  label: string;
};

export function useArtistAutocomplete() {
  const [search, setSearch] = useState<string>("");
  const [options, setOptions] = useState<ArtistOption[]>([]);
  const [selected, setSelected] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const fetchArtists = async () => {
      try {
        setLoading(true);
        const users: any[] = await searchArtists({
          q: search,
          limit: 30,
        });

        if (!active) return;

        setOptions(
          users.map((u) => ({
            id: u.id,
            email: u.email,
            label:
              `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
          }))
        );
      } catch (err) {
        console.error("Error cargando artistas", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchArtists();

    return () => {
      active = false;
    };
  }, [search]);

  return {
    search,
    setSearch,
    options,
    selected,
    setSelected,
    loading,
  };
}
