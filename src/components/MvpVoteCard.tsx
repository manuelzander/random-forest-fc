import { useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Check, Lock } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMvpVote } from '@/hooks/useMvpVote';

/** Aligns every ping animation to the same 1s wall-clock phase so pulses stay in sync */
const syncedPing = () => ({ animationDelay: `-${Date.now() % 1000}ms` });

export interface MvpCandidate {
  playerId: string;
  name: string;
  avatarUrl?: string | null;
}

interface MvpVoteCardProps {
  gameScheduleId: string;
  candidates: MvpCandidate[];
  /** Overrides the "MVP VOTE" heading, e.g. with the fixture date */
  heading?: string;
  /** Tighter layout for grid usage: no instruction note, no bars, trimmed tally */
  compact?: boolean;
}

const MvpVoteCard = ({ gameScheduleId, candidates, heading, compact = false }: MvpVoteCardProps) => {
  const { state, loading, isVoting, castVote, clearVote } = useMvpVote(gameScheduleId);
  const { toast } = useToast();

  const kickedOff = state ? state.is_open || state.is_closed : false;

  const progress = useMemo(() => {
    if (!state || state.eligible_voters === 0) return 0;
    return Math.min(100, Math.round((state.votes_cast / state.eligible_voters) * 100));
  }, [state]);

  if (loading || !state || !kickedOff) return null;

  const canVote = state.is_open && !!state.my_player_id && state.am_eligible;
  const votableCandidates = candidates.filter(c => c.playerId !== state.my_player_id);
  const winnerIds = state.winner_player_ids ?? (state.winner_player_id ? [state.winner_player_id] : []);
  const winners = state.results.filter(r => winnerIds.includes(r.player_id));
  const topVotes = state.results[0]?.votes ?? 0;
  // Three or more players on the top count means no award at all
  const noAwardTie = state.is_closed && winners.length === 0 && (state.tied_count ?? 0) > 2;

  const handleVote = async (playerId: string) => {
    if (state.my_vote === playerId) {
      const { error } = await clearVote();
      toast(
        error
          ? { title: 'Error', description: error, variant: 'destructive' }
          : { title: 'Vote withdrawn', description: 'You can pick again any time before voting closes.' }
      );
      return;
    }
    const { error } = await castVote(playerId);
    toast(
      error
        ? { title: 'Error', description: error, variant: 'destructive' }
        : { title: 'Vote cast', description: 'Your MVP pick is secret until voting closes.' }
    );
  };

  return (
    <div>
      <div className={`flex justify-between items-center ${compact ? 'mb-4' : 'mb-6'}`}>
        <h3 className={`font-display text-foreground tracking-wide ${compact ? 'text-xl' : 'text-2xl'}`}>{heading ?? 'MVP VOTE'}</h3>
        {state.is_open ? (
          <span className="relative flex items-center justify-center">
            <span style={syncedPing()} className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20" />
            <span className="relative bg-primary/10 text-primary text-[10px] px-2 py-1 rounded border border-primary/20 font-bold uppercase tracking-wide">
              Open
            </span>
          </span>
        ) : (
          <span className="bg-white/[0.06] text-muted-foreground text-[10px] px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-wide">
            Closed
          </span>
        )}
      </div>

      <div className={compact ? 'space-y-3' : 'space-y-5'}>

        {/* Meta line */}
        <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${state.is_open ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
          <span>
            {state.is_open
              ? `Closes in ${formatDistanceToNowStrict(new Date(state.closes_at))}`
              : `Closed ${format(new Date(state.closes_at), 'MMM d, h:mm a')}`}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span>
            {state.votes_cast} of {state.eligible_voters} voted
          </span>
        </p>

        {/* Progress rail */}
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {state.is_open && (
          <>
            {!canVote ? (
              compact ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>Roster players only</span>
                </p>
              ) : (
                <div className="info-note">
                  <Lock className="info-note-icon" />
                  <span>Only signed-in players on this game's roster can vote for MVP.</span>
                </div>
              )
            ) : votableCandidates.length === 0 ? (
              <div className="empty-tile">
                <Trophy className="h-6 w-6 text-muted-foreground" />
                <p>No other players on the roster to vote for.</p>
              </div>
            ) : (
              <>
                {!compact && (
                  <div className="info-note">
                    <Crown className="info-note-icon" />
                    <span>
                      Tap a name to pick the player of the match — tap again to undo. Votes stay secret
                      until the ballot closes 3 days after kick-off, then the winner is awarded
                      automatically.
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {votableCandidates.map(candidate => {
                    const isPick = state.my_vote === candidate.playerId;
                    return (
                      <button
                        key={candidate.playerId}
                        type="button"
                        disabled={isVoting || !canVote}
                        onClick={() => handleVote(candidate.playerId)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-all duration-300 text-left disabled:opacity-60 ${
                          isPick
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <Avatar className="h-8 w-8 border border-white/10">
                          <AvatarImage src={candidate.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {candidate.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`font-medium truncate text-sm sm:text-base flex-1 ${
                            isPick ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {candidate.name}
                        </span>
                        {isPick && (
                          <Badge className="status-badge status-badge-verified">
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Your vote</span>
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {state.is_closed && (
          <>
            {state.results.length === 0 ? (
              <div className="empty-tile">
                <Trophy className="h-6 w-6 text-muted-foreground" />
                <p>No votes were cast for this game.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {noAwardTie && (
                  <div className="info-note">
                    <Trophy className="info-note-icon" />
                    <span>
                      The vote ended tied between {state.tied_count} players, so no MVP was awarded
                      for this game.
                    </span>
                  </div>
                )}

                {winners.map(winner => (
                  <div
                    key={winner.player_id}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl border border-primary/40 bg-primary/[0.07]"
                  >
                    <span className="relative flex shrink-0 items-center justify-center">
                      <span style={syncedPing()} className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-25" />
                      <Avatar className="relative h-9 w-9 border border-white/10">
                        <AvatarImage src={winner.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {winner.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </span>
                    <span className="font-medium truncate text-sm sm:text-base text-foreground flex-1">
                      {winner.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-primary font-bold shrink-0">
                      {winners.length > 1 ? 'Joint MVP' : 'MVP'}
                    </span>
                    <span className="font-display text-base text-primary w-6 text-right shrink-0">
                      {winner.votes}
                    </span>
                  </div>
                ))}

                {(() => {
                  const rest = state.results.filter(r => !winnerIds.includes(r.player_id));
                  const shown = compact ? rest.slice(0, 3) : rest;
                  const hidden = rest.length - shown.length;
                  return (
                    <>
                      {shown.map(result => (
                        <div
                          key={result.player_id}
                          className="flex items-center gap-3 p-2 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/5"
                        >
                          <Avatar className="h-8 w-8 border border-white/10">
                            <AvatarImage src={result.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {result.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate text-sm sm:text-base text-foreground flex-1">
                            {result.name}
                          </span>
                          {!compact && (
                            <div className="hidden sm:block w-28 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/50"
                                style={{ width: `${topVotes ? (result.votes / topVotes) * 100 : 0}%` }}
                              />
                            </div>
                          )}
                          <span className="font-display text-base text-muted-foreground w-6 text-right">
                            {result.votes}
                          </span>
                        </div>
                      ))}
                      {hidden > 0 && (
                        <p className="text-xs text-muted-foreground pl-1">+{hidden} more</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>

  );
};

export default MvpVoteCard;
