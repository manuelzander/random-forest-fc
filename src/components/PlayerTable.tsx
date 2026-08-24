import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { getCachedBadges } from '@/utils/badgeCache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, Trophy, Target, Users, Award, CheckCircle, User } from 'lucide-react';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';
import { supabase } from '@/integrations/supabase/client';

interface PlayerWithProfile extends Player {
  profile?: {
    football_skills?: string[];
    skill_ratings?: any;
  };
}

interface PlayerTableProps {
  players: PlayerWithProfile[];
}

interface PlayerWithForm extends PlayerWithProfile {
  recentResults?: ('win' | 'draw' | 'loss')[];
}

const PlayerAvatarWithDefault = ({ player }: { player: Player }) => {
  const { avatarUrl } = useDefaultAvatar({
    playerId: player.id,
    playerName: player.name,
    currentAvatarUrl: player.avatar_url
  });

  return (
    <Avatar className="h-10 w-10 border border-white/10">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="bg-white/10 text-foreground text-xs">
        {player.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

type SortField = 'points' | 'mvp_awards' | 'goal_difference' | 'games_played' | 'pointsPerGame' | 'winPercentage';

const PlayerTable: React.FC<PlayerTableProps> = ({ players }) => {
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [playersWithForm, setPlayersWithForm] = useState<PlayerWithForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (players.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchFormData = async () => {
      try {
        const playerIds = players.map(p => p.id);
        const { data: allGamesData, error: gamesError } = await supabase
          .from('games')
          .select('team1_players, team2_players, team1_goals, team2_goals, created_at')
          .or(playerIds.map(id => `team1_players.cs.{${id}},team2_players.cs.{${id}}`).join(','))
          .order('created_at', { ascending: false })
          .limit(6 * playerIds.length);

        const playersWithRecentResults: PlayerWithForm[] = players.map(player => {
          const playerGames = (allGamesData || [])
            .filter(game => 
              game.team1_players.includes(player.id) || 
              game.team2_players.includes(player.id)
            )
            .slice(0, 6);

          const recentResults: ('win' | 'draw' | 'loss')[] = [];
          
          playerGames.forEach(game => {
            const isTeam1 = game.team1_players.includes(player.id);
            const playerGoals = isTeam1 ? game.team1_goals : game.team2_goals;
            const opponentGoals = isTeam1 ? game.team2_goals : game.team1_goals;
            
            if (playerGoals > opponentGoals) {
              recentResults.push('win');
            } else if (playerGoals === opponentGoals) {
              recentResults.push('draw');
            } else {
              recentResults.push('loss');
            }
          });
          
          return {
            ...player,
            recentResults: recentResults.reverse()
          };
        });
        
        setPlayersWithForm(playersWithRecentResults);
      } catch (error) {
        console.error('Error fetching form data:', error);
        setPlayersWithForm(players as PlayerWithForm[]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, [players]);

  const sortedPlayers = [...playersWithForm].sort((a, b) => {
    if (sortField === 'points' && sortDirection === 'desc') {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      const aPPG = a.games_played > 0 ? a.points / a.games_played : 0;
      const bPPG = b.games_played > 0 ? b.points / b.games_played : 0;
      if (bPPG !== aPPG) {
        return bPPG - aPPG;
      }
      
      return b.goal_difference - a.goal_difference;
    }
    
    let aValue: number;
    let bValue: number;
    
    if (sortField === 'pointsPerGame') {
      aValue = a.games_played > 0 ? a.points / a.games_played : 0;
      bValue = b.games_played > 0 ? b.points / b.games_played : 0;
    } else if (sortField === 'winPercentage') {
      aValue = a.games_played > 0 ? (a.wins / a.games_played) * 100 : 0;
      bValue = b.games_played > 0 ? (b.wins / b.games_played) * 100 : 0;
    } else {
      aValue = a[sortField as keyof Player] as number;
      bValue = b[sortField as keyof Player] as number;
    }
    
    if (sortDirection === 'desc') {
      return bValue - aValue;
    }
    return aValue - bValue;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-2 font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
      )}
    </Button>
  );

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-amber-400/20 text-amber-300 border border-amber-400/40';
    if (rank === 2) return 'bg-slate-300/20 text-slate-200 border border-slate-300/40';
    if (rank === 3) return 'bg-orange-400/20 text-orange-300 border border-orange-400/40';
    if (rank <= 5) return 'bg-primary/20 text-primary border border-primary/40';
    return 'bg-white/10 text-muted-foreground border border-white/15';
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-0">
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Trophy className="card-header-glass-icon h-5 w-5 sm:h-6 sm:w-6" />
            Player Ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader className="card-header-glass py-4">
        <CardTitle className="card-header-glass-title">
          <Trophy className="card-header-glass-icon h-5 w-5 sm:h-6 sm:w-6" />
          Player Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Player</th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="points">
                    <Award className="h-4 w-4 mr-1" />
                    Points
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="games_played">
                    <Users className="h-4 w-4 mr-1" />
                    Games
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="pointsPerGame">
                    <Target className="h-4 w-4 mr-1" />
                    PPG
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="winPercentage">Win %</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="mvp_awards">MVP</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="goal_difference">Goal Diff</SortButton>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-muted-foreground">Record & Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <tr 
                    key={player.id} 
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-4">
                       <Badge 
                         className={`${getRankBadgeColor(rank)} font-bold font-display text-sm`}
                       >
                         {rank}
                       </Badge>
                    </td>
                     <td className="px-3 py-4">
                       <div className="flex items-center gap-3">
                         <PlayerAvatarWithDefault player={player} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/player/${player.id}`}>
                            <Button variant="link" className="p-0 h-auto font-semibold text-left hover:text-primary text-foreground">
                              {player.name}
                            </Button>
                          </Link>
                            {(player as any).user_id ? (
                               <Badge className="bg-primary/15 text-primary border-primary/30 border flex items-center gap-1 px-1.5 py-0.5 text-xs h-auto">
                                 <CheckCircle className="h-3 w-3" />
                                 <span className="hidden sm:inline">Verified</span>
                               </Badge>
                             ) : (
                               <Badge className="bg-[hsl(var(--aurora-blue))]/15 text-[hsl(var(--aurora-blue))] border-[hsl(var(--aurora-blue))]/30 border flex items-center gap-1 px-1.5 py-0.5 text-xs h-auto">
                                 <User className="h-3 w-3" />
                                 <span className="hidden sm:inline">Unverified</span>
                               </Badge>
                             )}
                            {getCachedBadges(player, player.profile).slice(0, 3).map((badge, badgeIndex) => (
                              <Badge key={badgeIndex} className="bg-amber-400/15 text-amber-300 border border-amber-400/25 flex items-center gap-1 px-1.5 py-0.5 text-xs h-auto">
                                <span>{typeof badge.icon === 'string' ? badge.icon : '✅'}</span>
                              </Badge>
                             ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Badge className="font-bold text-lg bg-white/10 text-foreground border-white/10">
                        {player.points}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-center font-medium text-foreground">{player.games_played}</td>
                     <td className="px-3 py-4 text-center">
                       <Badge className="font-semibold bg-[hsl(var(--aurora-purple))]/15 text-[hsl(var(--aurora-purple))] border-[hsl(var(--aurora-purple))]/30">
                         {player.games_played > 0 ? (player.points / player.games_played).toFixed(1) : '0.0'}
                       </Badge>
                     </td>
                     <td className="px-3 py-4 text-center">
                       <Badge className="font-semibold bg-[hsl(var(--aurora-blue))]/15 text-[hsl(var(--aurora-blue))] border-[hsl(var(--aurora-blue))]/30">
                         {player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}%
                       </Badge>
                     </td>
                    <td className="px-3 py-4 text-center">
                      <Badge className="font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/25">
                        {player.mvp_awards}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`font-medium ${
                        player.goal_difference > 0 ? 'text-primary' : 
                        player.goal_difference < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {player.goal_difference > 0 ? '+' : ''}{player.goal_difference}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm">
                      <div className="space-y-1">
                        <div className="flex gap-1 justify-center">
                          <span className="text-primary font-medium">{player.wins}W</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-amber-300 font-medium">{player.draws}D</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-destructive font-medium">{player.losses}L</span>
                        </div>
                        <div className="flex gap-0.5 justify-center">
                          {player.recentResults && player.recentResults.length > 0 ? (
                            player.recentResults.slice(0, 6).map((result, index) => (
                              <div 
                                key={index}
                                className={`w-3 h-3 rounded ${
                                  result === 'win' ? 'bg-primary' :
                                  result === 'draw' ? 'bg-amber-300' :
                                  'bg-destructive'
                                }`}
                                title={result === 'win' ? 'Win' : result === 'draw' ? 'Draw' : 'Loss'}
                              />
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">No games</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerTable;
