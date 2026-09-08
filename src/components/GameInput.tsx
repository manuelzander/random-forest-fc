
import React, { useState } from 'react';
import { Player, GameInput as GameInputType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Users, Target, Award, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isValidYouTubeUrl } from '@/utils/youtube';
import { supabase } from '@/integrations/supabase/client';
import PlayerNameAutocomplete from './PlayerNameAutocomplete';

interface GameInputProps {
  players: Player[];
  onGameSubmit: (game: GameInputType) => void;
  onPlayersChange?: () => void; // Callback to refresh players list after creating new player
  initialData?: {
    team1Goals: number;
    team2Goals: number;
    team1Players: string[];
    team2Players: string[];
    team1Captain: string;
    team2Captain: string;
    mvpPlayers?: string[];
    bibsPlayer?: string;
    youtubeUrl?: string;
  };
  isEditing?: boolean;
  isSaving?: boolean;
}

const GameInput: React.FC<GameInputProps> = ({ players, onGameSubmit, onPlayersChange, initialData, isEditing = false, isSaving = false }) => {
  const { toast } = useToast();
  const [team1Players, setTeam1Players] = useState<string[]>(initialData?.team1Players || []);
  const [team2Players, setTeam2Players] = useState<string[]>(initialData?.team2Players || []);
  const [team1Goals, setTeam1Goals] = useState<string>(initialData?.team1Goals?.toString() || '');
  const [team2Goals, setTeam2Goals] = useState<string>(initialData?.team2Goals?.toString() || '');
  const [team1Captain, setTeam1Captain] = useState(initialData?.team1Captain || '');
  const [team2Captain, setTeam2Captain] = useState(initialData?.team2Captain || '');
  const [mvpPlayers, setMvpPlayers] = useState<string[]>(initialData?.mvpPlayers || []);
  const [bibsPlayer, setBibsPlayer] = useState(initialData?.bibsPlayer || '');
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl || '');
  const [gameScheduleId, setGameScheduleId] = useState<string>('');
  const [mvpPrefilledFor, setMvpPrefilledFor] = useState<string>('');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{playerId: string, playerName: string, teamNumber: 1 | 2} | null>(null);
  const [team1Input, setTeam1Input] = useState('');
  const [team2Input, setTeam2Input] = useState('');
  const [localPlayers, setLocalPlayers] = useState<Player[]>(players);

  const {
    fixtures,
    tallies,
    leaders,
    suggestedWinners,
    isClosed,
    totalVotes,
  } = useMvpSuggestion(gameScheduleId === 'none' ? '' : gameScheduleId, !isEditing);

  // Default to the most recent fixture without a result
  React.useEffect(() => {
    if (!isEditing && !gameScheduleId && fixtures.length > 0) {
      setGameScheduleId(fixtures[0].id);
    }
  }, [fixtures, gameScheduleId, isEditing]);

  // Pre-select the vote outcome once per fixture, when voting has closed with a clear result
  React.useEffect(() => {
    if (isEditing || !gameScheduleId || gameScheduleId === 'none') return;
    if (mvpPrefilledFor === gameScheduleId) return;
    if (!isClosed) return;
    setMvpPrefilledFor(gameScheduleId);
    if (suggestedWinners.length > 0) {
      setMvpPlayers(suggestedWinners);
    }
  }, [gameScheduleId, isClosed, suggestedWinners, mvpPrefilledFor, isEditing]);

  const voteCount = (playerId: string) => tallies.find(t => t.playerId === playerId)?.votes || 0;

  const formatFixture = (fixture: { scheduled_at: string; pitch_size: string | null }) => {
    const date = new Date(fixture.scheduled_at);
    const label = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const pitch = fixture.pitch_size === 'small' ? 'Small pitch' : fixture.pitch_size === 'big' ? 'Big pitch' : '';
    return [label, time, pitch].filter(Boolean).join(' · ');
  };

  const voteHint = (() => {
    if (isEditing || !gameScheduleId || gameScheduleId === 'none') return '';
    if (totalVotes === 0) return 'No player votes for this game.';
    if (!isClosed) return `Player vote so far (${totalVotes} cast) — voting is still open.`;
    if (leaders.length > 2) return `Player vote: ${leaders.length}-way tie, so no MVP point is awarded.`;
    if (leaders.length === 2) return 'Player vote: two players tied — both share the MVP point.';
    return 'Player vote result — pre-selected below, change it if you like.';
  })();

  // Update local players when props change
  React.useEffect(() => {
    setLocalPlayers(players);
  }, [players]);


  const availablePlayersForTeam1 = localPlayers.filter(p => !team2Players.includes(p.id) && !team1Players.includes(p.id));
  const availablePlayersForTeam2 = localPlayers.filter(p => !team1Players.includes(p.id) && !team2Players.includes(p.id));
  const allGamePlayers = [...team1Players, ...team2Players];

  // An MVP award can be shared by at most two players
  const toggleMvpPlayer = (playerId: string) => {
    if (playerId === 'none') {
      setMvpPlayers([]);
      return;
    }
    if (mvpPlayers.includes(playerId)) {
      setMvpPlayers(mvpPlayers.filter(id => id !== playerId));
      return;
    }
    if (mvpPlayers.length >= 2) {
      toast({
        title: 'Two MVPs maximum',
        description: 'An MVP award can be shared by at most two players.',
      });
      return;
    }
    setMvpPlayers([...mvpPlayers, playerId]);
  };


  const addPlayerToTeam = (teamNumber: 1 | 2, playerId: string) => {
    if (teamNumber === 1) {
      setTeam1Players([...team1Players, playerId]);
    } else {
      setTeam2Players([...team2Players, playerId]);
    }
  };

  const handlePlayerSelect = async (teamNumber: 1 | 2, suggestion: { id: string | null; name: string; type: string }) => {
    let playerId = suggestion.id;
    
    // If it's a new player or guest/orphan, create a new player record
    if (suggestion.type === 'new' || suggestion.type === 'guest' || suggestion.type === 'orphan') {
      try {
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({ name: suggestion.name })
          .select('id, name')
          .single();
        
        if (error) throw error;
        
        playerId = newPlayer.id;
        
        // Add to local players list
        setLocalPlayers(prev => [...prev, { 
          ...newPlayer, 
          points: 0, 
          games_played: 0, 
          wins: 0, 
          draws: 0, 
          losses: 0, 
          mvp_awards: 0, 
          goal_difference: 0 
        }]);
        
        // Notify parent to refresh players
        onPlayersChange?.();
        
        toast({
          title: "Player Created",
          description: `${suggestion.name} has been added as a new player`,
        });
      } catch (error) {
        console.error('Error creating player:', error);
        toast({
          title: "Error",
          description: "Failed to create new player",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (playerId) {
      addPlayerToTeam(teamNumber, playerId);
    }
  };

  const openRemoveDialog = (teamNumber: 1 | 2, playerId: string) => {
    const playerName = localPlayers.find(p => p.id === playerId)?.name || 'Unknown Player';
    setPlayerToRemove({ playerId, playerName, teamNumber });
    setRemoveDialogOpen(true);
  };

  const removePlayerFromTeam = () => {
    if (!playerToRemove) return;

    const { teamNumber, playerId } = playerToRemove;
    
    if (teamNumber === 1) {
      setTeam1Players(team1Players.filter(id => id !== playerId));
      // Reset captain if removed player was captain
      if (team1Captain === playerId) {
        setTeam1Captain('');
      }
    } else {
      setTeam2Players(team2Players.filter(id => id !== playerId));
      // Reset captain if removed player was captain
      if (team2Captain === playerId) {
        setTeam2Captain('');
      }
    }
    
    setRemoveDialogOpen(false);
    setPlayerToRemove(null);
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

    if (!team1Captain || !team1Players.includes(team1Captain)) {
      toast({
        title: "Error",
        description: "Please select a valid captain for Team 1",
        variant: "destructive",
      });
      return;
    }

    if (!team2Captain || !team2Players.includes(team2Captain)) {
      toast({
        title: "Error",
        description: "Please select a valid captain for Team 2",
        variant: "destructive",
      });
      return;
    }

    // MVP validation - optional, up to two joint MVPs from the playing players
    if (mvpPlayers.some(id => !allGamePlayers.includes(id))) {
      toast({
        title: "Error",
        description: "Please select a valid MVP from the playing players",
        variant: "destructive",
      });
      return;
    }

    if (mvpPlayers.length > 2) {
      toast({
        title: "Error",
        description: "An MVP award can be shared by at most two players",
        variant: "destructive",
      });
      return;
    }

    // Bibs validation - optional, but if selected must be valid
    if (bibsPlayer && bibsPlayer !== "none" && !allGamePlayers.includes(bibsPlayer)) {
      toast({
        title: "Error",
        description: "Please select a valid bibs player from the playing players",
        variant: "destructive",
      });
      return;
    }

    // Validate YouTube URL if provided
    if (youtubeUrl && !isValidYouTubeUrl(youtubeUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const gameData: GameInputType = {
      team1Players,
      team2Players,
      team1Goals: parseInt(team1Goals) || 0,
      team2Goals: parseInt(team2Goals) || 0,
      team1Captain,
      team2Captain,
      mvpPlayers,
      bibsPlayer: bibsPlayer === "none" ? null : bibsPlayer || null,
      youtubeUrl: youtubeUrl || undefined,
    };

    onGameSubmit(gameData);
    
    // Reset form only if not editing
    if (!isEditing) {
      setTeam1Players([]);
      setTeam2Players([]);
      setTeam1Goals('');
      setTeam2Goals('');
      setTeam1Captain('');
      setTeam2Captain('');
      setMvpPlayers([]);
      setBibsPlayer('');
      setYoutubeUrl('');
      
      toast({
        title: "Game Recorded!",
        description: "The match result has been successfully recorded.",
      });
    } else {
      toast({
        title: "Game Updated!",
        description: "The match result has been successfully updated.",
      });
    }
  };

  const getPlayerName = (playerId: string) => {
    return localPlayers.find(p => p.id === playerId)?.name || '';
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto border-0 bg-transparent shadow-none backdrop-blur-none">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Teams Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team 1 */}
            <div className="glass-form-section space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team 1 Players
              </Label>
              <Select onValueChange={(value) => addPlayerToTeam(1, value)} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Select existing player" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayersForTeam1.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PlayerNameAutocomplete
                value={team1Input}
                onChange={setTeam1Input}
                onSelect={(suggestion) => handlePlayerSelect(1, suggestion)}
                existingPlayers={localPlayers.map(p => ({ id: p.id, name: p.name }))}
                excludePlayerIds={[...team1Players, ...team2Players]}
                placeholder="Or type to add new player..."
              />
              <div className="flex flex-wrap gap-2">
                {team1Players.map((playerId) => (
                  <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                    {getPlayerName(playerId)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => openRemoveDialog(1, playerId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Team 2 */}
            <div className="glass-form-section space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team 2 Players
              </Label>
              <Select onValueChange={(value) => addPlayerToTeam(2, value)} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Select existing player" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayersForTeam2.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PlayerNameAutocomplete
                value={team2Input}
                onChange={setTeam2Input}
                onSelect={(suggestion) => handlePlayerSelect(2, suggestion)}
                existingPlayers={localPlayers.map(p => ({ id: p.id, name: p.name }))}
                excludePlayerIds={[...team1Players, ...team2Players]}
                placeholder="Or type to add new player..."
              />
              <div className="flex flex-wrap gap-2">
                {team2Players.map((playerId) => (
                  <Badge key={playerId} variant="secondary" className="flex items-center gap-1">
                    {getPlayerName(playerId)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => openRemoveDialog(2, playerId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Captains Section */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Team 1 Captain */}
            <div className="space-y-2">
              <Label className="sr-only">Team 1 Captain</Label>
              <Select value={team1Captain} onValueChange={setTeam1Captain}>
                <SelectTrigger>
                  <SelectValue placeholder="Team 1 captain" />
                </SelectTrigger>
                <SelectContent>
                  {team1Players.map((playerId) => (
                    <SelectItem key={playerId} value={playerId}>
                      {getPlayerName(playerId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team 2 Captain */}
            <div className="space-y-2">
              <Label className="sr-only">Team 2 Captain</Label>
              <Select value={team2Captain} onValueChange={setTeam2Captain}>
                <SelectTrigger>
                  <SelectValue placeholder="Team 2 captain" />
                </SelectTrigger>
                <SelectContent>
                  {team2Players.map((playerId) => (
                    <SelectItem key={playerId} value={playerId}>
                      {getPlayerName(playerId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Score Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team1Goals" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Team 1 goals</Label>
              <Input
                id="team1Goals"
                type="number"
                min="0"
                value={team1Goals}
                onChange={(e) => setTeam1Goals(e.target.value)}
                className="text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team2Goals" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Team 2 goals</Label>
              <Input
                id="team2Goals"
                type="number"
                min="0"
                value={team2Goals}
                onChange={(e) => setTeam2Goals(e.target.value)}
                className="text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Fixture picker — determines which vote the result belongs to */}
          {!isEditing && (
            <div className="space-y-2">
              <Label className="sr-only">Scheduled game</Label>
              <Select value={gameScheduleId} onValueChange={setGameScheduleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Scheduled game (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked to a scheduled game</SelectItem>
                  {fixtures.map((fixture) => (
                    <SelectItem key={fixture.id} value={fixture.id}>
                      {formatFixture(fixture)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* MVP Section — up to two joint MVPs */}
          <div className="space-y-2">
            <Label className="sr-only">MVP Player (Optional)</Label>
            {voteHint && (
              <p className="text-xs text-muted-foreground">{voteHint}</p>
            )}
            {tallies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tallies.map((tally) => (
                  <button
                    key={tally.playerId}
                    type="button"
                    onClick={() => toggleMvpPlayer(tally.playerId)}
                    className="text-xs"
                    title="Select as MVP"
                  >
                    <Badge variant="outline" className="h-auto w-fit">
                      {getPlayerName(tally.playerId) || 'Unknown player'} · {tally.votes}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
            <Select value="" onValueChange={toggleMvpPlayer}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    mvpPlayers.length === 0
                      ? 'MVP player (optional, up to two)'
                      : mvpPlayers.map(getPlayerName).join(' & ')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="none" value="none">None</SelectItem>
                {allGamePlayers.map((playerId) => (
                  <SelectItem key={playerId} value={playerId}>
                    {mvpPlayers.includes(playerId) ? '👑 ' : ''}
                    {getPlayerName(playerId)}
                    {voteCount(playerId) > 0 ? ` · ${voteCount(playerId)} votes` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mvpPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mvpPlayers.map((playerId) => (
                  <button
                    key={playerId}
                    type="button"
                    onClick={() => toggleMvpPlayer(playerId)}
                    title="Remove MVP"
                  >
                    <Badge className="badge-trophy h-auto w-fit">
                      <span>👑</span>
                      {getPlayerName(playerId)}
                      <span className="ml-1 text-muted-foreground">✕</span>
                    </Badge>
                  </button>
                ))}
                {mvpPlayers.length === 2 && (
                  <span className="text-xs text-muted-foreground self-center">
                    Joint MVP — both get the point
                  </span>
                )}
              </div>
            )}
          </div>


          {/* Bibs Section */}
          <div className="space-y-2">
            <Label className="sr-only">Bibs Player (Optional)</Label>
            <Select value={bibsPlayer} onValueChange={setBibsPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Bibs player (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="none" value="none">None</SelectItem>
                {allGamePlayers.map((playerId) => (
                  <SelectItem key={playerId} value={playerId}>
                    {getPlayerName(playerId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* YouTube Video Section */}
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl" className="sr-only">YouTube Video (Optional)</Label>
            <Input
              id="youtubeUrl"
              type="url"
              placeholder="YouTube video URL (optional)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Update Match Result' : 'Record Match Result'}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Remove Player Confirmation Dialog */}
    <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Player</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove "{playerToRemove?.playerName}" from Team {playerToRemove?.teamNumber}? If they were the captain, a new captain will need to be selected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={removePlayerFromTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove Player
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default GameInput;
