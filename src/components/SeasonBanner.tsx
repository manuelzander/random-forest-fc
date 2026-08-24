import { useState, useRef, useEffect } from 'react';
import { useSeasons } from '@/hooks/useSeasons';
import { ChevronDown, History } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium season banner with a glass "time-travel" switcher.
 * Clicking the season name expands a satisfying drawer of season chips.
 */
const SeasonBanner = ({ className }: { className?: string }) => {
  const { seasons, selectedSeason, selectedSeasonId, setSelectedSeasonId, isArchive, isLoading } =
    useSeasons();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (isLoading || !selectedSeason || seasons.length === 0) return null;

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Main Banner Control */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'relative z-10 flex w-full items-center justify-between',
          'rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-lg backdrop-blur-xl',
          'cursor-pointer transition-all duration-300',
          open && 'rounded-b-none border-b-transparent'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Season
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground italic uppercase">
                {selectedSeason.name}
              </h2>
              {isArchive ? (
                <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                  <History className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                    Archive
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                    Live
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            'bg-primary/10 text-primary',
            'transition-transform duration-500',
            open && 'rotate-180'
          )}
        >
          <ChevronDown className="h-5 w-5" />
        </div>
      </button>

      {/* Time-Travel Switcher Drawer */}
      <div
        className={cn(
          'absolute top-full left-0 z-20 w-full overflow-hidden',
          'transition-all duration-300 ease-out',
          open
            ? 'max-h-96 translate-y-0 opacity-100 pointer-events-auto'
            : 'max-h-0 translate-y-[-10px] opacity-0 pointer-events-none'
        )}
      >
        <div className="rounded-b-2xl border-x border-b border-primary/20 bg-card/80 p-2 shadow-lg backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-1">
            {seasons.map((season) => {
              const isSelected = season.id === selectedSeasonId;
              return (
                <button
                  key={season.id}
                  onClick={() => {
                    setSelectedSeasonId(season.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'group/item flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all',
                    isSelected
                      ? 'border border-primary/30 bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                  )}
                >
                  <span className="text-sm font-medium">{season.name}</span>
                  {isSelected ? (
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 transition-opacity group-hover/item:opacity-100">
                      {season.is_current ? 'Current' : 'Archive'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tactical Detail Footer */}
          <div className="mt-2 flex justify-between border-t border-primary/10 px-2 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            <span>Time Travel</span>
            <span>{seasons.length} seasons</span>
          </div>
        </div>
      </div>

      {/* Ambient glow behind the banner when open */}
      <div
        className={cn(
          'absolute -inset-4 -z-10 rounded-full bg-primary/5 blur-3xl',
          'transition-opacity duration-700',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

export default SeasonBanner;
