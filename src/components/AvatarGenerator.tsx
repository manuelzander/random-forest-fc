import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface AvatarGeneratorProps {
  players: Player[];
  onAvatarsGenerated: () => void;
}

export const AvatarGenerator = ({ players, onAvatarsGenerated }: AvatarGeneratorProps) => {
  const { toast } = useToast();
  const [generatingFor, setGeneratingFor] = useState<string[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateAvatarForPlayer = async (player: Player) => {
    try {
      setGeneratingFor(prev => [...prev, player.id]);
      
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName: player.name,
          playerId: player.id 
        }
      });

      if (error) throw error;

      if (data?.success && data?.avatarUrl) {
        // Update player avatar in database
        await supabase
          .from('players')
          .update({ avatar_url: data.avatarUrl })
          .eq('id', player.id);

        toast({
          title: "Avatar generated!",
          description: `Generated hilarious avatar for ${player.name}`,
        });
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        title: "Error",
        description: `Failed to generate avatar for ${player.name}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(prev => prev.filter(id => id !== player.id));
    }
  };

  const generateAllAvatars = async () => {
    try {
      setIsGeneratingAll(true);
      const playersWithoutAvatars = players.filter(p => !p.avatar_url);
      
      for (const player of playersWithoutAvatars) {
        await generateAvatarForPlayer(player);
      }
      
      onAvatarsGenerated();
      
      toast({
        title: "All avatars generated!",
        description: `Generated ${playersWithoutAvatars.length} hilarious avatars`,
      });
    } catch (error) {
      console.error('Error generating all avatars:', error);
      toast({
        title: "Error",
        description: "Failed to generate some avatars",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const playersWithoutAvatars = players.filter(p => !p.avatar_url);

  if (playersWithoutAvatars.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            🎉 All players already have awesome avatars!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Generate Player Avatars
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {playersWithoutAvatars.length} players need avatars
          </p>
          <Button 
            onClick={generateAllAvatars}
            disabled={isGeneratingAll}
            variant="default"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating All...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate All Avatars
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          {playersWithoutAvatars.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">{player.name}</span>
              <Button
                size="sm"
                onClick={() => generateAvatarForPlayer(player)}
                disabled={generatingFor.includes(player.id)}
                variant="outline"
              >
                {generatingFor.includes(player.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Avatar
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            ℹ️ Avatars are automatically generated for new players. 
            For existing players without avatars, use the buttons above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};