import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { History, Crown, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getYouTubeEmbedUrl } from '@/utils/youtube';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';

interface Game {
  id: string;
  team1_goals: number;
  team2_goals: number;
  team1_players: string[];
  team2_players: string[];
  team1_captain: string | null;
  team2_captain: string | null;
  mvp_player: string | null;
  created_at: string;
  youtube_url?: string | null;
}

interface Player {
  id: string;
  name: string;
  avatar_url?: string | null;
}

const PlayerAvatarWithDefault = ({ player }: { player: Player }) => {
  const { avatarUrl } = useDefaultAvatar({
    playerId: player.id,
    playerName: player.name,
    currentAvatarUrl: player.avatar_url
  });

  return (
    <Avatar className="h-8 w-8 border border-white/10">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="text-xs">
        {player.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

interface GamesListProps {
  /** When set, show archived games for this season instead of the live season */
  archiveSeasonId?: string | null;
}

const GamesList = ({ archiveSeasonId = null }: GamesListProps) => {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [archiveSeasonId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const gamesQuery = archiveSeasonId
        ? supabase
            .from('archived_games')
            .select('*')
            .eq('season_id', archiveSeasonId)
            .order('created_at', { ascending: false })
        : supabase
            .from('games')
            .select('*')
            .order('created_at', { ascending: false });

      const [gamesResponse, playersResponse] = await Promise.all([
        gamesQuery,
        supabase
          .from('players')
          .select('id, name, avatar_url')
          .order('name')
      ]);

      if (gamesResponse.error) throw gamesResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setGames((gamesResponse.data as Game[]) || []);
      setPlayers(playersResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId) || { id: playerId, name: 'Unknown Player', avatar_url: null };
  };

  const getPlayerName = (playerId: string) => {
    return getPlayer(playerId).name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderTeam = (game: Game, team: 1 | 2) => {
    const playerIds = team === 1 ? game.team1_players : game.team2_players;
    const captain = team === 1 ? game.team1_captain : game.team2_captain;
    const goals = team === 1 ? game.team1_goals : game.team2_goals;
    const otherGoals = team === 1 ? game.team2_goals : game.team1_goals;
    const isWinner = goals > otherGoals;

    return (
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-base sm:text-lg text-foreground tracking-wide uppercase">
            Team {team}
          </h4>
          {isWinner && (
            <span className="text-[10px] px-2 py-1 rounded border font-bold bg-primary/10 text-primary border-primary/20">
              WINNER
            </span>
          )}
        </div>
        <div className="space-y-2">
          {playerIds.map((playerId, index) => (
            <div
              key={playerId}
              className="group/row flex items-center justify-between p-2 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/5"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Badge variant="outline" className="slot-number">
                  #{index + 1}
                </Badge>
                <PlayerAvatarWithDefault player={getPlayer(playerId)} />
                <Link
                  to={`/player/${playerId}`}
                  className="font-medium truncate text-sm sm:text-base text-foreground hover:text-primary transition-colors"
                >
                  {getPlayerName(playerId)}
                </Link>
                <div className="flex gap-1 shrink-0">
                  {captain === playerId && (
                    <Badge className="status-badge status-badge-unverified !text-foreground/85">
                      <Crown className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Captain</span>
                    </Badge>
                  )}
                  {game.mvp_player === playerId && (
                    <Badge className="badge-trophy h-auto w-fit">
                      <span>👑</span>
                      MVP
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="card-header-glass py-4">
        <CardTitle className="card-header-glass-title">
          <History className="card-header-glass-icon h-6 w-6" />
          Game History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {games.length === 0 ? (
          <div className="empty-tile">
            <History className="h-6 w-6 text-muted-foreground" />
            <p>No games have been played yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <div key={game.id} className="glass-panel overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight leading-none mb-2 uppercase">
                        {format(new Date(game.created_at), 'EEEE, MMM d')}
                      </h3>
                      <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{format(new Date(game.created_at), 'yyyy')}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{game.team1_players.length + game.team2_players.length} players</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-display text-3xl sm:text-4xl leading-none ${game.team1_goals >= game.team2_goals ? 'text-primary' : 'text-muted-foreground'}`}>
                        {game.team1_goals}
                      </span>
                      <span className="text-muted-foreground/50 text-sm">vs</span>
                      <span className={`font-display text-3xl sm:text-4xl leading-none ${game.team2_goals >= game.team1_goals ? 'text-primary' : 'text-muted-foreground'}`}>
                        {game.team2_goals}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] border-t border-white/10 p-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {renderTeam(game, 1)}
                    {renderTeam(game, 2)}
                  </div>

                  {game.youtube_url && (
                    <div className="mt-6 pt-5 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="h-4 w-4 text-primary" />
                        <span className="font-display text-base text-foreground tracking-wide uppercase">Game Recording</span>
                        <a
                          href={game.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Watch on YouTube
                        </a>
                      </div>
                      <div className="relative w-full aspect-video bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                        {getYouTubeEmbedUrl(game.youtube_url) ? (
                          <iframe
                            src={getYouTubeEmbedUrl(game.youtube_url)!}
                            title={`Game highlights from ${format(new Date(game.created_at), 'MMM d, yyyy')}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-muted-foreground">Unable to load video</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

};

export default GamesList;