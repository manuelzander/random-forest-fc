
import React, { useState } from 'react';
import { Player, GameInput as GameInputType } from '@/types';
import { allPlayers } from '@/utils/sampleData';
import PlayerTable from '@/components/PlayerTable';
import GameInput from '@/components/GameInput';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Plus, BarChart } from 'lucide-react';

const Index = () => {
  const [players, setPlayers] = useState<Player[]>(allPlayers);
  const [activeTab, setActiveTab] = useState('rankings');

  const handleGameSubmit = (gameData: GameInputType) => {
    console.log('Game submitted:', gameData);
    
    // Update player statistics based on game result
    const updatedPlayers = players.map(player => {
      const isInTeam1 = gameData.team1Players.includes(player.id);
      const isInTeam2 = gameData.team2Players.includes(player.id);
      
      if (!isInTeam1 && !isInTeam2) return player;

      // Calculate points for this game
      let gamePoints = 0;
      const isWinner = (isInTeam1 && gameData.team1Goals > gameData.team2Goals) || 
                      (isInTeam2 && gameData.team2Goals > gameData.team1Goals);
      const isDraw = gameData.team1Goals === gameData.team2Goals;
      
      if (isWinner) gamePoints += 3;
      else if (isDraw) gamePoints += 1;

      // Add MVP bonus
      if (gameData.mvpPlayer === player.id) gamePoints += 2;

      // Update player stats
      return {
        ...player,
        gamesPlayed: player.gamesPlayed + 1,
        wins: isWinner ? player.wins + 1 : player.wins,
        draws: isDraw ? player.draws + 1 : player.draws,
        losses: (!isWinner && !isDraw) ? player.losses + 1 : player.losses,
        mvpAwards: gameData.mvpPlayer === player.id ? player.mvpAwards + 1 : player.mvpAwards,
        points: Math.round((player.points + gamePoints) * 10) / 10, // Round to 1 decimal
        goalDifference: isInTeam1 ? 
          player.goalDifference + (gameData.team1Goals - gameData.team2Goals) :
          player.goalDifference + (gameData.team2Goals - gameData.team1Goals)
      };
    });

    setPlayers(updatedPlayers.sort((a, b) => b.points - a.points));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Football League</h1>
            </div>
            <div className="text-sm text-gray-600">
              {players.length} Players • Weekly Matches
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="add-game" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Game
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{players.length}</div>
                  <div className="text-sm text-gray-600">Total Players</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {players.reduce((sum, p) => sum + p.gamesPlayed, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Games Played</div>
                </CardContent>
              </Card>
            </div>

            {/* Player Table */}
            <PlayerTable players={players} />
          </TabsContent>

          <TabsContent value="add-game">
            <GameInput players={players} onGameSubmit={handleGameSubmit} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
