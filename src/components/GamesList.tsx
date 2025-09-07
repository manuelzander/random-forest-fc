import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { History, Calendar, Crown, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '@/utils/youtube';
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
    <Avatar className="h-6 w-6">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="text-xs">
        {player.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

const GamesList = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('GamesList: Starting fetch...');
      const [gamesResponse, playersResponse] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('players')
          .select('id, name, avatar_url')
          .order('name')
      ]);

      console.log('GamesList: Fetch results:', { 
        gamesError: gamesResponse.error, 
        playersError: playersResponse.error,
        gamesCount: gamesResponse.data?.length,
        playersCount: playersResponse.data?.length
      });

      if (gamesResponse.error) throw gamesResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setGames(gamesResponse.data || []);
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
      <div className="text-center py-8">
        <div>Loading games...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <History className="h-6 w-6" />
          Game History
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {games.length === 0 ? (
          <Alert>
            <AlertDescription>
              No games have been played yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <div key={game.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Team 1</div>
                      <div className="text-2xl font-bold text-primary">{game.team1_goals}</div>
                    </div>
                    <div className="text-lg font-medium text-muted-foreground">vs</div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Team 2</div>
                      <div className="text-2xl font-bold text-primary">{game.team2_goals}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(game.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Team 1 Players:</div>
                      <div className="space-y-1">
                         {game.team1_players.map(playerId => (
                           <div key={playerId} className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <PlayerAvatarWithDefault player={getPlayer(playerId)} />
                               <span>{getPlayerName(playerId)}</span>
                                {game.team1_captain === playerId && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0.5 h-auto">
                                    <Crown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Captain</span>
                                    <span className="sm:hidden">C</span>
                                  </Badge>
                                )}
                             </div>
                              {game.mvp_player === playerId && (
                                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1 py-0.5 text-xs h-auto border-0 w-fit">
                                  <span>👑</span>
                                  MVP
                                </Badge>
                              )}
                          </div>
                        ))}
                      </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Team 2 Players:</div>
                      <div className="space-y-1">
                         {game.team2_players.map(playerId => (
                           <div key={playerId} className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <PlayerAvatarWithDefault player={getPlayer(playerId)} />
                               <span>{getPlayerName(playerId)}</span>
                                {game.team2_captain === playerId && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0.5 h-auto">
                                    <Crown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Captain</span>
                                    <span className="sm:hidden">C</span>
                                  </Badge>
                                )}
                             </div>
                              {game.mvp_player === playerId && (
                                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1 py-0.5 text-xs h-auto border-0 w-fit">
                                  <span>👑</span>
                                  MVP
                                </Badge>
                              )}
                          </div>
                        ))}
                      </div>
                  </div>
                 </div>
                
                {/* YouTube Video Section */}
                {game.youtube_url && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Game Highlights</span>
                      <a 
                        href={game.youtube_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Watch on YouTube
                      </a>
                    </div>
                    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GamesList;