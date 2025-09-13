import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '@/types';
import { getBadges } from '@/utils/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trophy, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';

interface AchievementsTableProps {
  players: Player[];
}

const AchievementsTable: React.FC<AchievementsTableProps> = ({ players }) => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);

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

  // Get all unique badges from all players
  const allBadges = Array.from(
    new Map(
      players.flatMap(player => getBadges(player))
        .map(badge => [badge.name, badge])
    ).values()
  );

  // Group badges by category
  const badgeCategories = {
    'Performance': allBadges.filter(badge => 
      ['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent'].includes(badge.name)
    ),
    'Skills & Scoring': allBadges.filter(badge => 
      ['Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled'].includes(badge.name)
    ),
    'Experience': allBadges.filter(badge => 
      ['Hall of Famer', 'Warrior', 'Veteran'].includes(badge.name)
    ),
    'Special Moves': allBadges.filter(badge => 
      ['Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife'].includes(badge.name)
    ),
    'Form & Personality': allBadges.filter(badge => 
      ['On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name)
    ),
    'Quirky & Fun': allBadges.filter(badge => 
      !['Legend', 'MVP Champion', 'Dominator', 'Champion', 'Winner', 'Elite Performer', 'Consistent',
        'Goal God', 'Goal Machine', 'Sharp Shooter', 'Speed Demon', 'Sniper', 'Wall', 'Magician', 'Playmaker', 'Beast', 'Maestro', 'Skilled',
        'Hall of Famer', 'Warrior', 'Veteran',
        'Showboat', 'Acrobat', 'Humiliator', 'Artist', 'Swiss Army Knife',
        'On Fire', 'Stormy Weather', 'Diplomat', 'Peacekeeper', 'Team Player', 'Unstoppable', 'Balanced'].includes(badge.name)
    )
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <Trophy className="h-6 w-6" />
          Player Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Badge Legend */}
        <div className="p-4 border-b bg-gray-50">
          <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:text-blue-600 transition-colors font-medium text-gray-900">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Badge Guide</span>
              {isLegendOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6">
              {Object.entries(badgeCategories).map(([category, badges]) => {
                if (badges.length === 0) return null;
                return (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {badges.map((badge) => (
                        <div key={badge.name} className="flex items-start gap-3 p-3 rounded-lg bg-white border shadow-sm hover:shadow-md transition-shadow">
                          <span className="text-xl flex-shrink-0 mt-0.5">{badge.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900">{badge.name}</div>
                            <div className="text-xs text-gray-600 mt-1 leading-relaxed">{badge.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-900 w-12">Rank</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">Player</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-900">Badge Count</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-900 min-w-[300px]">Achievements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player, index) => {
                const playerBadges = getBadges(player);
                const rank = index + 1;
                
                const getRankBadgeColor = (rank: number) => {
                  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-600';
                  if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 border-gray-500';
                  if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 border-amber-800';
                  if (rank <= 5) return 'bg-gradient-to-r from-green-500 to-green-600 border-green-600';
                  return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600';
                };
                
                return (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors">
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
                        <Link 
                          to={`/player/${player.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {player.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Badge variant="secondary" className="font-bold text-lg bg-blue-100 text-blue-800 border-0">
                        {playerBadges.length}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {playerBadges.length > 0 ? (
                          playerBadges.slice(0, 8).map((badge, badgeIndex) => (
                            <div
                              key={badgeIndex}
                              className="flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border-0 rounded-md px-2.5 py-1.5 text-xs hover:bg-yellow-200 transition-colors shadow-sm"
                              title={`${badge.name}: ${badge.description}`}
                            >
                              <span className="text-sm">{badge.icon}</span>
                              <span className="hidden sm:inline font-medium">{badge.name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No badges earned yet</span>
                        )}
                        {playerBadges.length > 8 && (
                          <Badge variant="outline" className="text-xs font-semibold text-gray-600 border-gray-300">
                            +{playerBadges.length - 8} more
                          </Badge>
                        )}
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

export default AchievementsTable;