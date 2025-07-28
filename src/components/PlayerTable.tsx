
import React, { useState } from 'react';
import { Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trophy, Target, Users, Award } from 'lucide-react';

interface PlayerTableProps {
  players: Player[];
}

type SortField = 'points' | 'mvpAwards' | 'goalDifference' | 'gamesPlayed' | 'pointsPerGame' | 'winPercentage';

const PlayerTable: React.FC<PlayerTableProps> = ({ players }) => {
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: number;
    let bValue: number;
    
    if (sortField === 'pointsPerGame') {
      aValue = a.gamesPlayed > 0 ? a.points / a.gamesPlayed : 0;
      bValue = b.gamesPlayed > 0 ? b.points / b.gamesPlayed : 0;
    } else if (sortField === 'winPercentage') {
      aValue = a.gamesPlayed > 0 ? (a.wins / a.gamesPlayed) * 100 : 0;
      bValue = b.gamesPlayed > 0 ? (b.wins / b.gamesPlayed) * 100 : 0;
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
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800';
    if (rank <= 5) return 'bg-gradient-to-r from-green-500 to-green-600';
    return 'bg-gradient-to-r from-blue-500 to-blue-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="h-6 w-6" />
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
                  <SortButton field="gamesPlayed">
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
                  <SortButton field="mvpAwards">MVP</SortButton>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="goalDifference">Goal Diff</SortButton>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Record</th>
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
                        className={`${getRankBadgeColor(rank)} text-white font-bold`}
                      >
                        {rank}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{player.name}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="secondary" className="font-bold text-lg">
                        {player.points}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center font-medium">{player.gamesPlayed}</td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="font-semibold text-green-700">
                        {player.gamesPlayed > 0 ? (player.points / player.gamesPlayed).toFixed(1) : '0.0'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="font-semibold text-blue-700">
                        {player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0}%
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="font-semibold text-yellow-700">
                        {player.mvpAwards}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-medium ${
                        player.goalDifference > 0 ? 'text-green-600' : 
                        player.goalDifference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {player.goalDifference > 0 ? '+' : ''}{player.goalDifference}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm">
                      <div className="flex gap-1 justify-center">
                        <span className="text-green-600 font-medium">{player.wins}W</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-yellow-600 font-medium">{player.draws}D</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-red-600 font-medium">{player.losses}L</span>
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
