import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
}

interface Player {
  id: string;
  name: string;
}

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
          .select('id, name')
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

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Game History
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                               <span>{getPlayerName(playerId)}</span>
                               {game.team1_captain === playerId && (
                                 <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                                   <Crown className="h-3 w-3 mr-1" />
                                   Captain
                                 </Badge>
                               )}
                             </div>
                             {game.mvp_player === playerId && (
                               <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1.5 py-0.5 text-xs h-5 border-0">
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
                               <span>{getPlayerName(playerId)}</span>
                               {game.team2_captain === playerId && (
                                 <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                                   <Crown className="h-3 w-3 mr-1" />
                                   Captain
                                 </Badge>
                               )}
                             </div>
                             {game.mvp_player === playerId && (
                               <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1.5 py-0.5 text-xs h-5 border-0">
                                 <span>👑</span>
                                 MVP
                               </Badge>
                             )}
                          </div>
                        ))}
                      </div>
                  </div>
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