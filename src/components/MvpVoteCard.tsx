import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Check, Lock } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMvpVote } from '@/hooks/useMvpVote';

export interface MvpCandidate {
  playerId: string;
  name: string;
  avatarUrl?: string | null;
}

interface MvpVoteCardProps {
  gameScheduleId: string;
  candidates: MvpCandidate[];
}

const MvpVoteCard = ({ gameScheduleId, candidates }: MvpVoteCardProps) => {
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
  const winner = state.results.find(r => r.player_id === state.winner_player_id);
  const topVotes = state.results[0]?.votes ?? 0;

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
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display text-2xl text-foreground tracking-wide">MVP VOTE</h3>
        {state.is_open ? (
          <span className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20" />
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

      <div className="space-y-5">

        {/* Meta line */}
        <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
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
              <div className="info-note">
                <Lock className="info-note-icon" />
                <span>Only signed-in players on this game's roster can vote for MVP.</span>
              </div>
            ) : votableCandidates.length === 0 ? (
              <div className="empty-tile">
                <Trophy className="h-6 w-6 text-muted-foreground" />
                <p>No other players on the roster to vote for.</p>
              </div>
            ) : (
              <>
                <div className="info-note">
                  <Crown className="info-note-icon" />
                  <span>
                    Tap a name to pick the player of the match — tap again to undo. Votes stay secret
                    until the ballot closes 3 days after kick-off, then the winner is awarded
                    automatically.
                  </span>
                </div>
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
                {winner && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/10">
                    <Avatar className="h-11 w-11 avatar-glow">
                      <AvatarImage src={winner.avatar_url || undefined} />
                      <AvatarFallback>{winner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                        Player of the match
                      </p>
                      <p className="font-display text-2xl text-foreground leading-none truncate">
                        {winner.name}
                      </p>
                    </div>
                    <Badge className="badge-trophy ml-auto shrink-0">
                      <span>👑</span>
                      {winner.votes} {winner.votes === 1 ? 'vote' : 'votes'}
                    </Badge>
                  </div>
                )}

                {state.results
                  .filter(r => r.player_id !== state.winner_player_id)
                  .map(result => (
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
                      <div className="hidden sm:block w-28 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/50"
                          style={{ width: `${topVotes ? (result.votes / topVotes) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-display text-base text-muted-foreground w-6 text-right">
                        {result.votes}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>

  );
};

export default MvpVoteCard;
