import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useOpenMvpReminders } from '@/hooks/useOpenMvpReminders';
import { cn } from '@/lib/utils';

/** Keeps every pulse aligned to the same 1s wall-clock phase */
const syncedPing = () => ({ animationDelay: `-${Date.now() % 1000}ms` });

interface MvpVoteReminderProps {
  /** Fixture whose own vote card is already on the page — never reminded about here */
  excludeGameScheduleId?: string;
  className?: string;
}

/**
 * Slim glass reminder for a signed-in roster player with an open MVP vote
 * they have not cast yet. Dismissal is per-visit only.
 */
const MvpVoteReminder = ({ excludeGameScheduleId, className }: MvpVoteReminderProps) => {
  const { reminders, loading } = useOpenMvpReminders(excludeGameScheduleId);
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || reminders.length === 0) return null;

  const next = reminders[0];
  const extra = reminders.length - 1;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-primary/25',
        'bg-gradient-to-r from-primary/[0.09] via-white/[0.03] to-transparent',
        'px-4 py-3 shadow-lg backdrop-blur-xl',
        className
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
          style={syncedPing()}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <Trophy className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 text-sm">
        <span className="text-foreground">
          Your MVP vote is open for{' '}
          <span className="font-semibold">{format(new Date(next.scheduledAt), 'EEE d MMM')}</span>
        </span>
        <span className="text-muted-foreground">
          {' '}
          &middot; closes in {formatDistanceToNowStrict(new Date(next.closesAt))}
        </span>
        {extra > 0 && (
          <span className="text-muted-foreground/70"> &middot; +{extra} more</span>
        )}
      </div>
      <Link
        to={`/signup/${next.gameScheduleId}#mvp-vote`}
        className="header-nav-button inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
      >
        Vote now
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss MVP vote reminder"
        className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default MvpVoteReminder;
