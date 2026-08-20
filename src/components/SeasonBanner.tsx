import { useState } from 'react';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, History, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Slim season banner. Clicking the season name reveals a subtle inline
 * picker that lets you "time travel" into an archived season.
 */
const SeasonBanner = ({ className }: { className?: string }) => {
  const { seasons, selectedSeason, selectedSeasonId, setSelectedSeasonId, isArchive, isLoading } =
    useSeasons();
  const [open, setOpen] = useState(false);

  if (isLoading || !selectedSeason || seasons.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isArchive
          ? 'border-amber-300 bg-amber-50/80'
          : 'border-border bg-gradient-to-r from-green-600/10 to-green-700/5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              isArchive ? 'text-amber-700' : 'text-muted-foreground'
            )}
          >
            Season
          </span>
          <span
            className={cn(
              'text-base font-bold sm:text-lg',
              isArchive ? 'text-amber-800' : 'text-foreground'
            )}
          >
            {selectedSeason.name}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 opacity-40 transition-all group-hover:opacity-100',
              open && 'rotate-180'
            )}
          />
        </button>

        {isArchive ? (
          <Badge className="border-0 bg-amber-200 text-xs text-amber-900">
            <History className="mr-1 h-3 w-3" />
            Archive
          </Badge>
        ) : (
          <Badge className="border-0 bg-green-100 text-xs text-green-700">
            <Sparkles className="mr-1 h-3 w-3" />
            Live
          </Badge>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
          {seasons.map((season) => (
            <Button
              key={season.id}
              size="sm"
              variant={season.id === selectedSeasonId ? 'default' : 'outline'}
              className={cn(
                'h-7 text-xs',
                season.id === selectedSeasonId && 'bg-green-600 hover:bg-green-700'
              )}
              onClick={() => setSelectedSeasonId(season.id)}
            >
              {season.name}
              {season.is_current && <span className="ml-1 opacity-70">(current)</span>}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonBanner;
