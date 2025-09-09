
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, ArrowDown, Trophy, Target, Users, Award, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';
import { supabase } from '@/integrations/supabase/client';

interface PlayerTableProps {
  players: Player[];
}

interface PlayerWithForm extends Player {
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

  useEffect(() => {
    const fetchFormData = async () => {
      const playersWithRecentResults: PlayerWithForm[] = [];
      
      for (const player of players) {
        // Get recent games for this player
        const { data: statsData, error } = await supabase
          .from('games')
          .select('team1_players, team2_players, team1_goals, team2_goals, created_at')
          .or(`team1_players.cs.{${player.id}},team2_players.cs.{${player.id}}`)
          .order('created_at', { ascending: false })
          .limit(6);

        const recentResults: ('win' | 'draw' | 'loss')[] = [];
        
        if (statsData && !error) {
          statsData.forEach(game => {
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
        }
        
        playersWithRecentResults.push({
          ...player,
          recentResults: recentResults.reverse() // Reverse to show oldest to newest
        });
      }
      
      setPlayersWithForm(playersWithRecentResults);
    };

    if (players.length > 0) {
      fetchFormData();
    }
  }, [players]);

  const sortedPlayers = [...playersWithForm].sort((a, b) => {
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

  const getBadges = (player: PlayerWithForm) => {
    const badges = [];
    const winRate = player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0;
    const pointsPerGame = player.games_played > 0 ? player.points / player.games_played : 0;
    
    // Elite performance badges
    if (player.mvp_awards >= 10) {
      badges.push({ icon: '🌟', name: 'Legend', description: '10+ MVP Awards' });
    } else if (player.mvp_awards >= 5) {
      badges.push({ icon: '👑', name: 'MVP Champion', description: '5+ MVP Awards' });
    }
    
    if (player.goal_difference >= 25) {
      badges.push({ icon: '⚡', name: 'Goal God', description: '25+ Goal Difference' });
    } else if (player.goal_difference >= 15) {
      badges.push({ icon: '🚀', name: 'Goal Machine', description: '15+ Goal Difference' });
    } else if (player.goal_difference >= 10) {
      badges.push({ icon: '🎯', name: 'Sharp Shooter', description: '10+ Goal Difference' });
    }
    
    // Win rate badges
    if (winRate >= 90) {
      badges.push({ icon: '🥇', name: 'Dominator', description: '90%+ Win Rate' });
    } else if (winRate >= 80) {
      badges.push({ icon: '🏆', name: 'Champion', description: '80%+ Win Rate' });
    } else if (winRate >= 70) {
      badges.push({ icon: '🥉', name: 'Winner', description: '70%+ Win Rate' });
    }
    
    // Experience badges
    if (player.games_played >= 50) {
      badges.push({ icon: '🏛️', name: 'Hall of Famer', description: '50+ Games Played' });
    } else if (player.games_played >= 30) {
      badges.push({ icon: '⚔️', name: 'Warrior', description: '30+ Games Played' });
    } else if (player.games_played >= 20) {
      badges.push({ icon: '🎖️', name: 'Veteran', description: '20+ Games Played' });
    }
    
    // Advanced stats badges
    if (pointsPerGame >= 2.5) {
      badges.push({ icon: '💎', name: 'Elite Performer', description: '2.5+ Points Per Game' });
    } else if (pointsPerGame >= 2.0) {
      badges.push({ icon: '⭐', name: 'Consistent', description: '2.0+ Points Per Game' });
    }
    
    // Form-based badges
    if (player.recentResults && player.recentResults.length >= 5) {
      const recentWins = player.recentResults.filter(r => r === 'win').length;
      const recentLosses = player.recentResults.filter(r => r === 'loss').length;
      
      if (recentWins >= 5) {
        badges.push({ icon: '🔥', name: 'On Fire', description: '5+ recent wins' });
      } else if (recentWins === 0 && recentLosses >= 4) {
        badges.push({ icon: '🌧️', name: 'Stormy Weather', description: 'Rough patch' });
      }
    }
    
    // Funny/Creative badges
    if (player.goal_difference <= -15) {
      badges.push({ icon: '🕳️', name: 'Black Hole', description: 'Goals disappear around you' });
    } else if (player.goal_difference <= -10) {
      badges.push({ icon: '🤡', name: 'Goal Leaker', description: 'Conceded 10+ more goals than scored' });
    }
    
    if (player.draws >= 8) {
      badges.push({ icon: '🤝', name: 'Diplomat', description: '8+ drawn games' });
    } else if (player.draws >= 5) {
      badges.push({ icon: '⚖️', name: 'Peacekeeper', description: '5+ drawn games' });
    }
    
    if (player.losses >= 15) {
      badges.push({ icon: '💀', name: 'Cursed', description: '15+ losses' });
    } else if (player.losses >= 10) {
      badges.push({ icon: '😤', name: 'Unlucky', description: '10+ losses' });
    }
    
    // Special achievement badges
    if (winRate === 0 && player.games_played >= 5) {
      badges.push({ icon: '😅', name: 'Trying Hard', description: 'No wins yet but still playing!' });
    }
    if (player.mvp_awards === 0 && player.games_played >= 10) {
      badges.push({ icon: '🐐', name: 'Team Player', description: 'No MVPs but always showing up' });
    }
    if (winRate === 100 && player.games_played >= 3) {
      badges.push({ icon: '🦄', name: 'Unstoppable', description: 'Perfect win record' });
    }
    if (player.goal_difference === 0 && player.games_played >= 5) {
      badges.push({ icon: '⚖️', name: 'Balanced', description: 'Perfectly balanced goal difference' });
    }
    if (player.games_played === 1) {
      badges.push({ icon: '🆕', name: 'Fresh Meat', description: 'Just getting started' });
    }
    
    // More funny situational badges
    if (player.wins === player.draws && player.draws === player.losses && player.wins >= 2) {
      badges.push({ icon: '🎲', name: 'Chaos Agent', description: 'Equal wins, draws, and losses' });
    }
    if (player.games_played >= 15 && player.points === 0) {
      badges.push({ icon: '🍕', name: 'Participation Trophy', description: '15+ games with 0 points' });
    }
    if (player.draws > (player.wins + player.losses) && player.draws >= 3) {
      badges.push({ icon: '🎭', name: 'Drama Queen', description: 'More draws than wins and losses combined' });
    }
    if (player.games_played >= 5 && player.points === 1) {
      badges.push({ icon: '🐢', name: 'Slow Starter', description: 'Exactly 1 point after 5+ games' });
    }
    
    // Quirky statistical badges
    if (player.games_played >= 10 && player.wins === 0 && player.draws === 0) {
      badges.push({ icon: '🎯', name: 'Perfectionist', description: 'Consistent in losing' });
    }
    if (player.mvp_awards > player.wins) {
      badges.push({ icon: '👑', name: 'Hero of Lost Causes', description: 'More MVPs than wins' });
    }
    if (player && player.games_played >= 5 && Math.abs(player.goal_difference) === player.games_played) {
      badges.push({ icon: '📊', name: 'Mathematician', description: 'Goal difference equals games played' });
    }
    if (player.games_played >= 7 && player.wins === 1 && player.draws === 1 && player.losses >= 5) {
      badges.push({ icon: '🍀', name: 'One Hit Wonder', description: 'Rare moments of glory' });
    }
    
    // Weekend warrior type badges
    if (pointsPerGame < 1 && player.games_played >= 10) {
      badges.push({ icon: '🏃', name: 'Cardio King', description: 'Here for the exercise' });
    }
    if (player.mvp_awards >= 3 && winRate < 50) {
      badges.push({ icon: '🎪', name: 'Star of the Show', description: 'Individual brilliance in team struggles' });
    }
    
    return badges;
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Rankings
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
                            {(player as any).user_id && (
                               <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                 <CheckCircle className="h-3 w-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Verified</span>
                               </Badge>
                             )}
                            <TooltipProvider>
                              {getBadges(player).slice(0, 2).map((badge, badgeIndex) => (
                                <Tooltip key={badgeIndex}>
                                  <TooltipTrigger asChild>
                                    <Badge className="bg-yellow-100 text-yellow-800 border-0 flex items-center gap-1 px-1.5 py-0.5 text-xs h-5 cursor-pointer hover:opacity-80 transition-opacity">
                                      <span>{badge.icon}</span>
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="text-center">
                                      <div className="font-semibold">{badge.name}</div>
                                      <div className="text-sm text-muted-foreground">{badge.description}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
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
