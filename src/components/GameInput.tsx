
import React, { useState } from 'react';
import { Player, GameInput as GameInputType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, Target, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GameInputProps {
  players: Player[];
  onGameSubmit: (game: GameInputType) => void;
}

const GameInput: React.FC<GameInputProps> = ({ players, onGameSubmit }) => {
  const { toast } = useToast();
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [team1Goals, setTeam1Goals] = useState(0);
  const [team2Goals, setTeam2Goals] = useState(0);
  const [mvpPlayer, setMvpPlayer] = useState('');
  const [goalScorers, setGoalScorers] = useState<{ playerId: string; goals: number }[]>([]);
  

  const availablePlayersForTeam1 = players.filter(p => !team2Players.includes(p.id));
  const availablePlayersForTeam2 = players.filter(p => !team1Players.includes(p.id));
  const allGamePlayers = [...team1Players, ...team2Players];

  const addPlayerToTeam = (teamNumber: 1 | 2, playerId: string) => {
    if (teamNumber === 1) {
      setTeam1Players([...team1Players, playerId]);
    } else {
      setTeam2Players([...team2Players, playerId]);
    }
  };

  const removePlayerFromTeam = (teamNumber: 1 | 2, playerId: string) => {
    if (teamNumber === 1) {
      setTeam1Players(team1Players.filter(id => id !== playerId));
    } else {
      setTeam2Players(team2Players.filter(id => id !== playerId));
    }
  };

  const addGoalScorer = () => {
    setGoalScorers([...goalScorers, { playerId: '', goals: 1 }]);
  };

  const updateGoalScorer = (index: number, field: 'playerId' | 'goals', value: string | number) => {
    const updated = goalScorers.map((scorer, i) => 
      i === index ? { ...scorer, [field]: value } : scorer
    );
    setGoalScorers(updated);
  };

  const removeGoalScorer = (index: number) => {
    setGoalScorers(goalScorers.filter((_, i) => i !== index));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (team1Players.length === 0 || team2Players.length === 0) {
      toast({
        title: "Error",
        description: "Both teams must have at least one player",
        variant: "destructive",
      });
      return;
    }

    if (!mvpPlayer || !allGamePlayers.includes(mvpPlayer)) {
      toast({
        title: "Error",
        description: "Please select a valid MVP from the playing players",
        variant: "destructive",
      });
      return;
    }

    const gameData: GameInputType = {
      team1Players,
      team2Players,
      team1Goals,
      team2Goals,
      mvpPlayer,
      goalScorers: goalScorers.filter(scorer => scorer.playerId && scorer.goals > 0),
    };

    onGameSubmit(gameData);
    
    // Reset form
    setTeam1Players([]);
    setTeam2Players([]);
    setTeam1Goals(0);
    setTeam2Goals(0);
    setMvpPlayer('');
    setGoalScorers([]);

    toast({
      title: "Game Recorded!",
      description: "The match result has been successfully recorded.",
    });
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || '';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Target className="h-6 w-6" />
          Record Match Result
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Teams Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team 1 */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team 1 Players
              </Label>
              <Select onValueChange={(value) => addPlayerToTeam(1, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add player to Team 1" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayersForTeam1.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {team1Players.map((playerId) => (
                  <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                    {getPlayerName(playerId)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removePlayerFromTeam(1, playerId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Team 2 */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team 2 Players
              </Label>
              <Select onValueChange={(value) => addPlayerToTeam(2, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add player to Team 2" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayersForTeam2.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {team2Players.map((playerId) => (
                  <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                    {getPlayerName(playerId)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removePlayerFromTeam(2, playerId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Score Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="team1Goals">Team 1 Goals</Label>
              <Input
                id="team1Goals"
                type="number"
                min="0"
                value={team1Goals}
                onChange={(e) => setTeam1Goals(Number(e.target.value))}
                className="text-center text-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team2Goals">Team 2 Goals</Label>
              <Input
                id="team2Goals"
                type="number"
                min="0"
                value={team2Goals}
                onChange={(e) => setTeam2Goals(Number(e.target.value))}
                className="text-center text-xl font-bold"
              />
            </div>
          </div>

          {/* MVP Section */}
          <div className="space-y-2">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5" />
              MVP Player
            </Label>
            <Select value={mvpPlayer} onValueChange={setMvpPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Select MVP from playing players" />
              </SelectTrigger>
              <SelectContent>
                {allGamePlayers.map((playerId) => (
                  <SelectItem key={playerId} value={playerId}>
                    {getPlayerName(playerId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal Scorers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Goal Scorers</Label>
              <Button type="button" onClick={addGoalScorer} size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Scorer
              </Button>
            </div>
            {goalScorers.map((scorer, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={scorer.playerId}
                  onValueChange={(value) => updateGoalScorer(index, 'playerId', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {allGamePlayers.map((playerId) => (
                      <SelectItem key={playerId} value={playerId}>
                        {getPlayerName(playerId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={scorer.goals}
                  onChange={(e) => updateGoalScorer(index, 'goals', Number(e.target.value))}
                  className="w-20"
                  placeholder="Goals"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeGoalScorer(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>


          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
            Record Match Result
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GameInput;
