import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { ScheduledGame } from '@/types';

export interface SameDayGame {
  game: ScheduledGame;
  signupCount: number;
  capacity: number;
}

interface SameDayGamePromptProps {
  games: SameDayGame[];
  joiningId: string | null;
  onJoin: (entry: SameDayGame) => void;
}

const SameDayGamePrompt = ({ games, joiningId, onJoin }: SameDayGamePromptProps) => {
  if (games.length === 0) return null;

  return (
    <div className="space-y-2">
      {games.map((entry) => {
        const isFull = entry.signupCount >= entry.capacity;
        const isJoining = joiningId === entry.game.id;

        return (
          <div
            key={entry.game.id}
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Also playing today
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{format(new Date(entry.game.scheduled_at), 'h:mm a')}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{entry.game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  {entry.signupCount}/{entry.capacity}
                </span>
                {isFull && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>waitlist spot {entry.signupCount - entry.capacity + 1}</span>
                  </>
                )}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => onJoin(entry)}
              disabled={isJoining}
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isJoining ? 'Joining...' : isFull ? 'Join waitlist' : 'Join this too'}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default SameDayGamePrompt;
