import { format, isToday, isTomorrow } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { ScheduledGame } from '@/types';

export interface SameDayGame {
  game: ScheduledGame;
  signupCount: number;
  capacity: number;
  /** Own signup on that game (leave mode only) */
  signupId?: string;
  /** 1-based position among active signups (leave mode only) */
  position?: number;
}

interface SameDayGamePromptProps {
  games: SameDayGame[];
  mode?: 'join' | 'leave';
  busyId: string | null;
  onAction: (entry: SameDayGame) => void;
}

const SameDayGamePrompt = ({ games, mode = 'join', busyId, onAction }: SameDayGamePromptProps) => {
  if (games.length === 0) return null;

  return (
    <div className="space-y-2">
      {games.map((entry) => {
        const isFull = entry.signupCount >= entry.capacity;
        const isBusy = busyId === entry.game.id;
        const kickoff = new Date(entry.game.scheduled_at);
        const within24h = kickoff.getTime() - Date.now() < 24 * 60 * 60 * 1000;
        const dayLabel = isToday(kickoff)
          ? 'today'
          : isTomorrow(kickoff)
            ? 'tomorrow'
            : `on ${format(kickoff, 'EEE, MMM d')}`;
        const inRoster = (entry.position ?? Infinity) <= entry.capacity;
        const willDropout = mode === 'leave' && within24h && inRoster;

        const label =
          mode === 'join'
            ? isBusy
              ? 'Joining...'
              : isFull
                ? 'Join waitlist'
                : 'Join this too'
            : isBusy
              ? 'Cancelling...'
              : willDropout
                ? 'Cancel (dropout)'
                : 'Cancel too';

        return (
          <div
            key={entry.game.id}
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span
                  className={
                    mode === 'join'
                      ? 'inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse'
                      : 'inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/50'
                  }
                />
                {mode === 'join' ? `Also playing ${dayLabel}` : `Still signed up ${dayLabel}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{format(kickoff, 'h:mm a')}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{entry.game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  {entry.signupCount}/{entry.capacity}
                </span>
                {mode === 'join' && isFull && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>waitlist spot {entry.signupCount - entry.capacity + 1}</span>
                  </>
                )}
                {mode === 'leave' && entry.position !== undefined && entry.position > entry.capacity && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>waitlist spot {entry.position - entry.capacity}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant={mode === 'join' ? 'default' : 'outline'}
              onClick={() => onAction(entry)}
              disabled={isBusy}
              className={
                mode === 'join'
                  ? 'shrink-0 bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'shrink-0 header-nav-button'
              }
            >
              {label}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default SameDayGamePrompt;
