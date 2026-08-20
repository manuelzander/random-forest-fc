import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Season {
  id: string;
  name: string;
  is_current: boolean;
  started_on: string | null;
  ended_on: string | null;
}

interface SeasonContextValue {
  seasons: Season[];
  currentSeason: Season | null;
  selectedSeason: Season | null;
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string | null) => void;
  /** true when the user is time-travelling into an archived season */
  isArchive: boolean;
  /** the archived season id when time-travelling, otherwise null */
  archiveSeasonId: string | null;
  isLoading: boolean;
}

const SeasonContext = createContext<SeasonContextValue | undefined>(undefined);

export const SeasonProvider = ({ children }: { children: React.ReactNode }) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, is_current, started_on, ended_on')
        .order('is_current', { ascending: false })
        .order('name', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('Error fetching seasons:', error);
      } else {
        setSeasons(data || []);
        const current = (data || []).find((s) => s.is_current);
        setSelectedSeasonId((prev) => prev ?? current?.id ?? null);
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SeasonContextValue>(() => {
    const currentSeason = seasons.find((s) => s.is_current) || null;
    const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) || currentSeason;
    const isArchive = !!selectedSeason && !selectedSeason.is_current;
    return {
      seasons,
      currentSeason,
      selectedSeason,
      selectedSeasonId: selectedSeason?.id ?? null,
      setSelectedSeasonId,
      isArchive,
      archiveSeasonId: isArchive ? selectedSeason!.id : null,
      isLoading,
    };
  }, [seasons, selectedSeasonId, isLoading]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
};

export const useSeasons = () => {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeasons must be used within a SeasonProvider');
  return ctx;
};
