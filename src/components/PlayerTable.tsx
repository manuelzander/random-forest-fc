
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Trophy, Target, Users, Award, CheckCircle } from 'lucide-react';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';

interface PlayerTableProps {
  players: Player[];
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

  const sortedPlayers = [...players].sort((a, b) => {
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

  const getBadges = (player: Player) => {
    const badges = [];
    
    if (player.mvp_awards >= 5) {
      badges.push({ icon: '👑', name: 'MVP Champion' });
    }
    if (player.goal_difference >= 10) {
      badges.push({ icon: '🚀', name: 'Goal Machine' });
    }
    const winRate = player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0;
    if (winRate >= 70) {
      badges.push({ icon: '🏆', name: 'Winner' });
    }
    if (player.games_played >= 20) {
      badges.push({ icon: '🎯', name: 'Veteran' });
    }
    
    // Funny/Creative badges
    if (player.goal_difference <= -10) {
      badges.push({ icon: '🤡', name: 'Goal Leaker' });
    }
    if (player.draws >= 5) {
      badges.push({ icon: '🤝', name: 'Peacekeeper' });
    }
    if (player.losses >= 10) {
      badges.push({ icon: '💀', name: 'Unlucky' });
    }
    if (winRate === 0 && player.games_played >= 5) {
      badges.push({ icon: '😅', name: 'Trying Hard' });
    }
    if (player.mvp_awards === 0 && player.games_played >= 10) {
      badges.push({ icon: '🐐', name: 'Team Player' });
    }
    if (winRate === 100 && player.games_played >= 3) {
      badges.push({ icon: '🔥', name: 'Unstoppable' });
    }
    if (player.goal_difference === 0 && player.games_played >= 5) {
      badges.push({ icon: '⚖️', name: 'Balanced' });
    }
    if (player.games_played === 1) {
      badges.push({ icon: '🆕', name: 'Fresh Meat' });
    }
    
    // More funny badges
    if (player.wins === player.draws && player.draws === player.losses && player.wins >= 2) {
      badges.push({ icon: '🎲', name: 'Chaos Agent' });
    }
    if (player.games_played >= 15 && player.points === 0) {
      badges.push({ icon: '🍕', name: 'Participation Trophy' });
    }
    if (player.draws > (player.wins + player.losses) && player.draws >= 3) {
      badges.push({ icon: '🎭', name: 'Drama Queen' });
    }
    if (player.games_played >= 5 && player.points === 1) {
      badges.push({ icon: '🐢', name: 'Slow Starter' });
    }
    if (player.games_played >= 10 && Math.abs(player.goal_difference) <= 2) {
      badges.push({ icon: '🎪', name: 'Wildcard' });
    }
    
    return badges;
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Rankings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Player</th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="points">
                    <Award className="h-4 w-4 mr-1" />
                    Points
                  </SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="games_played">
                    <Users className="h-4 w-4 mr-1" />
                    Games
                  </SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="pointsPerGame">
                    <Target className="h-4 w-4 mr-1" />
                    PPG
                  </SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="winPercentage">Win %</SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="mvp_awards">MVP</SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="goal_difference">Goal Diff</SortButton>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Record & Form</th>
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
                    <td className="px-4 py-4">
                       <Badge 
                         className={`${getRankBadgeColor(rank)} text-white font-bold !border-0 border-transparent`}
                       >
                         {rank}
                       </Badge>
                    </td>
                     <td className="px-4 py-4">
                       <div className="flex items-center gap-3">
                         <PlayerAvatarWithDefault player={player} />
                        <div className="flex items-center gap-2">
                          <Link to={`/player/${player.id}`}>
                            <Button variant="link" className="p-0 h-auto font-semibold text-left hover:text-blue-600">
                              {player.name}
                            </Button>
                          </Link>
                            {(player as any).user_id && (
                               <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                 <CheckCircle className="h-3 w-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Verified</span>
                               </Badge>
                              )}
                            {getBadges(player).slice(0, 2).map((badge, badgeIndex) => (
                              <Tooltip key={badgeIndex}>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-yellow-100 text-yellow-800 border-0 flex items-center gap-1 px-1.5 py-0.5 text-xs h-5 cursor-help">
                                    <span>{badge.icon}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{badge.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="secondary" className="font-bold text-lg">
                        {player.points}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center font-medium">{player.games_played}</td>
                     <td className="px-4 py-4 text-center">
                       <Badge variant="outline" className="font-semibold text-purple-700">
                         {player.games_played > 0 ? (player.points / player.games_played).toFixed(1) : '0.0'}
                       </Badge>
                     </td>
                     <td className="px-4 py-4 text-center">
                       <Badge variant="outline" className="font-semibold text-blue-700">
                         {player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}%
                       </Badge>
                     </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="font-semibold text-yellow-700">
                        {player.mvp_awards}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-medium ${
                        player.goal_difference > 0 ? 'text-green-600' : 
                        player.goal_difference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {player.goal_difference > 0 ? '+' : ''}{player.goal_difference}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm">
                      <div className="space-y-1">
                        <div className="flex gap-1 justify-center">
                          <span className="text-green-600 font-medium">{player.wins}W</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-yellow-600 font-medium">{player.draws}D</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-red-600 font-medium">{player.losses}L</span>
                        </div>
                        {(() => {
                          // Get recent results from stats
                          const recentResults: ('win' | 'draw' | 'loss')[] = [];
                          // This would need to be calculated from games data - for now showing placeholder
                          for (let i = 0; i < Math.min(5, player.games_played); i++) {
                            if (i < player.wins) recentResults.push('win');
                            else if (i < player.wins + player.draws) recentResults.push('draw');
                            else recentResults.push('loss');
                          }
                          return (
                            <div className="flex gap-0.5 justify-center">
                              {recentResults.slice(0, 5).map((result, index) => (
                                <div 
                                  key={index}
                                  className={`w-3 h-3 rounded ${
                                    result === 'win' ? 'bg-green-500' :
                                    result === 'draw' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  title={result === 'win' ? 'Win' : result === 'draw' ? 'Draw' : 'Loss'}
                                />
                              ))}
                            </div>
                          );
                        })()}
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
    </TooltipProvider>
  );
};

export default PlayerTable;
