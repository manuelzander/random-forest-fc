
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
    <Avatar className="h-10 w-10">
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>
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
        // Batch fetch all recent games data in a single query
        const playerIds = players.map(p => p.id);
        const { data: allGamesData, error: gamesError } = await supabase
          .from('games')
          .select('team1_players, team2_players, team1_goals, team2_goals, created_at')
          .or(playerIds.map(id => `team1_players.cs.{${id}},team2_players.cs.{${id}}`).join(','))
          .order('created_at', { ascending: false })
          .limit(6 * playerIds.length);

        // Process data for each player (profile data already comes from parent)
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
    // Default sorting: Points -> PPG -> Goal Diff
    if (sortField === 'points' && sortDirection === 'desc') {
      // First sort by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // If points are equal, sort by points per game (descending)
      const aPPG = a.games_played > 0 ? a.points / a.games_played : 0;
      const bPPG = b.games_played > 0 ? b.points / b.games_played : 0;
      if (bPPG !== aPPG) {
        return bPPG - aPPG;
      }
      
      // If PPG is equal, sort by goal difference (descending)
      return b.goal_difference - a.goal_difference;
    }
    
    // For other sort fields, use standard sorting
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
      className="h-auto p-2 font-semibold"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
      )}
    </Button>
  );

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 border-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 border-amber-800';
    if (rank <= 5) return 'bg-gradient-to-r from-green-500 to-green-600 border-green-600';
    return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600';
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
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
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">Rank</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">Player</th>
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
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">Record & Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <tr 
                    key={player.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-4">
                       <Badge 
                         className={`${getRankBadgeColor(rank)} text-white font-bold !border-0 border-transparent`}
                       >
                         {rank}
                       </Badge>
                    </td>
                     <td className="px-3 py-4">
                       <div className="flex items-center gap-3">
                         <PlayerAvatarWithDefault player={player} />
                        <div className="flex items-center gap-2">
                          <Link to={`/player/${player.id}`}>
                            <Button variant="link" className="p-0 h-auto font-semibold text-left hover:text-blue-600">
                              {player.name}
                            </Button>
                          </Link>
                            {(player as any).user_id ? (
                               <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                 <CheckCircle className="h-3 w-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Verified</span>
                               </Badge>
                             ) : (
                               <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                                 <User className="h-3 w-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Unverified</span>
                               </Badge>
                             )}
                            {getCachedBadges(player, player.profile).slice(0, 3).map((badge, badgeIndex) => (
                              <Badge key={badgeIndex} className="bg-yellow-100 text-yellow-800 border-0 flex items-center gap-1 px-1.5 py-0.5 text-xs h-5">
                                <span>{typeof badge.icon === 'string' ? badge.icon : '✅'}</span>
                              </Badge>
                           ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Badge variant="secondary" className="font-bold text-lg">
                        {player.points}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-center font-medium">{player.games_played}</td>
                     <td className="px-3 py-4 text-center">
                       <Badge variant="outline" className="font-semibold text-purple-700">
                         {player.games_played > 0 ? (player.points / player.games_played).toFixed(1) : '0.0'}
                       </Badge>
                     </td>
                     <td className="px-3 py-4 text-center">
                       <Badge variant="outline" className="font-semibold text-blue-700">
                         {player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}%
                       </Badge>
                     </td>
                    <td className="px-3 py-4 text-center">
                      <Badge variant="outline" className="font-semibold text-yellow-700">
                        {player.mvp_awards}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`font-medium ${
                        player.goal_difference > 0 ? 'text-green-600' : 
                        player.goal_difference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {player.goal_difference > 0 ? '+' : ''}{player.goal_difference}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm">
                      <div className="space-y-1">
                        <div className="flex gap-1 justify-center">
                          <span className="text-green-600 font-medium">{player.wins}W</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-yellow-600 font-medium">{player.draws}D</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-red-600 font-medium">{player.losses}L</span>
                        </div>
                        <div className="flex gap-0.5 justify-center">
                          {player.recentResults && player.recentResults.length > 0 ? (
                            player.recentResults.slice(0, 6).map((result, index) => (
                              <div 
                                key={index}
                                className={`w-3 h-3 rounded ${
                                  result === 'win' ? 'bg-green-500' :
                                  result === 'draw' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                title={result === 'win' ? 'Win' : result === 'draw' ? 'Draw' : 'Loss'}
                              />
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No games</span>
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
