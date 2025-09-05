import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDefaultAvatarProps {
  playerId: string;
  playerName: string;
  currentAvatarUrl?: string | null;
}

export const useDefaultAvatar = ({ playerId, playerName, currentAvatarUrl }: UseDefaultAvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Update avatar URL when currentAvatarUrl changes
    setAvatarUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  useEffect(() => {
    // If no current avatar, try to generate a default one
    if (!currentAvatarUrl && !isGenerating && playerId && playerName) {
      generateDefaultAvatar();
    }
  }, [playerId, playerName, currentAvatarUrl]);

  const generateDefaultAvatar = async () => {
    try {
      setIsGenerating(true);
      
      // Check if default avatar already exists
      const { data: existingFile } = await supabase.storage
        .from('avatars')
        .list('default', {
          search: `default-avatar-${playerId}`
        });

      if (existingFile && existingFile.length > 0) {
        // Default avatar already exists, use it
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(`default/${existingFile[0].name}`);
        
        setAvatarUrl(data.publicUrl);
        
        // Update player record if not already set
        await supabase
          .from('players')
          .update({ avatar_url: data.publicUrl })
          .eq('id', playerId)
          .eq('avatar_url', null);
        
        return;
      }

      // Generate new default avatar
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName,
          playerId 
        }
      });

      if (error) {
        console.error('Error generating avatar:', error);
        return;
      }

      if (data?.success && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        
        // Update player record
        await supabase
          .from('players')
          .update({ avatar_url: data.avatarUrl })
          .eq('id', playerId);
      }
    } catch (error) {
      console.error('Failed to generate default avatar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return { avatarUrl: avatarUrl || currentAvatarUrl, isGenerating };
};