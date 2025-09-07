import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { User, Upload, X, Plus, Shuffle, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  bio?: string;
  football_skills?: string[];
  favorite_position?: string;
  years_playing?: number;
  favorite_club?: string;
  skill_ratings?: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

interface Props {
  userId: string;
  playerData?: any;
  onProfileUpdate?: () => void;
  onSave?: () => void;
}

const FOOTBALL_POSITIONS = [
  'Goalkeeper',
  'Center Back',
  'Left Back',
  'Right Back',
  'Defensive Midfielder',
  'Central Midfielder',
  'Attacking Midfielder',
  'Left Winger',
  'Right Winger',
  'Striker',
  'Center Forward'
];

const FUNNY_SKILLS = [
  // Hilarious skills only
  'Ball Watching',
  'Complaining to Ref',
  'Dramatic Diving',
  'Celebration Choreography',
  'Trash Talking',
  'Time Wasting',
  'Missing Open Goals',
  'Blaming the Pitch',
  'Over-Celebrating Tap-ins',
  'Arguing with VAR',
  'Professional Fouling',
  'Wind Assistance Claims',
  'Slide Tackling the Air',
  'Championship Manager Expert',
  'Shouting Instructions Nobody Follows',
  'Blaming Teammates Telepathically',
  'Invisible Wall Free Kicks',
  'Goalkeeper Intimidation Stare',
  'Tactical Fouling at Kickoff',
  'Weather Condition Excuses',
  'Shin Pad Adjustment Mastery',
  'Grass Length Complaints',
  'Armband Leadership (No Authority)',
  'Penalty Area Kung Fu',
  'Offside Trap Confusion',
  'Corner Flag Dancing',
  'Crossbar Challenge Champion',
  'Warm-up Showboating',
  'Water Break Negotiations',
  'Kit Color Psychology',
  'Half-time Orange Specialist',
  'Substitution Delay Tactics',
  'Throw-in Trajectory Science',
  'Goal Post Kissing',
  'Mascot Intimidation',
  'Crowd Interaction Drama',
  'Stadium Echo Utilization',
  'Referee Mind Reading',
  'Ball Boy Psychology',
  'Camera Awareness Acting',
  'Victory Lap Pacing',
  'Pre-Game Ritual Superstition',
  'Lucky Charm Dependency',
  'Tunnel Vision Excellence',
  'Gravity Defying Headers',
  'Time Zone Confusion',
  'Photobomb Positioning',
  'Social Media Goal Alerts',
  'Fantasy Football Self-Picking',
  'FIFA Rating Complaints',
  'Commentator Impression',
  'Victory Dance Rehearsal',
  'Interview Cliché Master',
  'Transfer Rumor Creation',
  'Boot Sponsor Loyalty',
  'Haircut Timing Strategy',
  'Goal Celebration Copyright',
  'Lucky Number Obsession'
];

const ProfileSkillsEditor = forwardRef<{ handleSave: () => void }, Props>(({ userId, playerData, onProfileUpdate, onSave }, ref) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    bio: '',
    football_skills: [],
    favorite_position: '',
    years_playing: undefined,
    skill_ratings: {
      pace: 50,
      shooting: 50,
      passing: 50,
      dribbling: 50,
      defending: 50,
      physical: 50
    }
  });
  const [newSkill, setNewSkill] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // Force re-render of file input

  // Simple function to check if avatar can be transformed (user uploaded vs AI generated)
  const canTransformAvatar = () => {
    // Can transform if we have a file ready to upload or current avatar is user-uploaded
    if (avatarFile) return true;
    if (!playerData?.avatar_url) return false;
    // User uploads go to userId/ path, AI generated go to default/ path
    return playerData.avatar_url.includes(`/${userId}/`);
  };

  // Expose handleSave to parent component
  useImperativeHandle(ref, () => ({
    handleSave
  }));

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      console.log('ProfileSkillsEditor: Fetching profile for userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('bio, football_skills, favorite_position, years_playing, favorite_club, skill_ratings')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('ProfileSkillsEditor: Profile query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          bio: data.bio || '',
          football_skills: Array.isArray(data.football_skills) ? data.football_skills as string[] : [],
          favorite_position: data.favorite_position || '',
          years_playing: data.years_playing || undefined,
          favorite_club: data.favorite_club || '',
          skill_ratings: (data.skill_ratings && typeof data.skill_ratings === 'object' && !Array.isArray(data.skill_ratings)) 
            ? data.skill_ratings as any 
            : {
                pace: 50,
                shooting: 50,
                passing: 50,
                dribbling: 50,
                defending: 50,
                physical: 50
              }
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profile data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload immediately
      if (playerData) {
        await uploadAvatarFile(file);
      }
    }
  };

  const uploadAvatarFile = async (file: File) => {
    if (!playerData) return;
    
    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update player avatar with fresh URL
      await supabase
        .from('players')
        .update({ avatar_url: data.publicUrl })
        .eq('id', playerData.id);

      toast({
        title: "Avatar uploaded!",
        description: "Your avatar has been updated successfully.",
      });

      // Clear states after successful upload and reset file input
      setAvatarFile(null);
      setAvatarPreview(null);
      setFileInputKey(prev => prev + 1); // Force file input reset

      onProfileUpdate?.();
      onSave?.(); // Notify parent that save completed
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Update profile (avatar is handled separately now)
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: profile.bio,
          football_skills: profile.football_skills as any,
          favorite_position: profile.favorite_position,
          years_playing: profile.years_playing,
          favorite_club: profile.favorite_club,
          skill_ratings: profile.skill_ratings as any
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      onProfileUpdate?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !profile.football_skills?.includes(skill)) {
      setProfile(prev => ({
        ...prev,
        football_skills: [...(prev.football_skills || []), skill]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      football_skills: prev.football_skills?.filter(skill => skill !== skillToRemove) || []
    }));
  };

  const generateRandomAvatar = async () => {
    if (!playerData) return;
    
    setIsGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName: playerData.name, 
          playerId: playerData.id,
          favoriteClub: profile.favorite_club
        }
      });

      if (error) throw error;

      if (data?.avatarUrl) {
        // Update player avatar in database
        await supabase
          .from('players')
          .update({ avatar_url: data.avatarUrl })
          .eq('id', playerData.id);

        toast({
          title: "Avatar Generated!",
          description: "Your new random avatar has been created.",
        });

        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        title: "Error",
        description: "Failed to generate avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const generateImageToImageAvatar = async () => {
    if (!playerData) return;
    
    if (!canTransformAvatar()) {
      toast({
        title: "Upload Required",
        description: "Please upload an image first to use AI Transform.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingAvatar(true);
    try {
      let baseImageData: string;
      
      if (avatarFile) {
        // Use the current file
        baseImageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
      } else if (playerData?.avatar_url) {
        // Fetch the current avatar and convert to base64
        const response = await fetch(playerData.avatar_url);
        const blob = await response.blob();
        baseImageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        throw new Error('No image available for transformation');
      }

      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName: playerData.name, 
          playerId: playerData.id,
          imageToImage: true,
          baseImageData,
          favoriteClub: profile.favorite_club
        }
      });

      if (error) throw error;

      if (data?.avatarUrl) {
        // Update player avatar in database
        await supabase
          .from('players')
          .update({ avatar_url: data.avatarUrl })
          .eq('id', playerData.id);

        toast({
          title: "Avatar Transformed!",
          description: "Your personalized cartoon avatar has been created.",
        });

        // Clear states after transformation and reset file input
        setAvatarFile(null);
        setAvatarPreview(null);
        setFileInputKey(prev => prev + 1); // Force file input reset

        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        title: "Error",
        description: "Failed to generate avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      {playerData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Avatar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex justify-center sm:justify-start">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={avatarPreview || playerData.avatar_url || undefined} />
                  <AvatarFallback className="text-lg sm:text-xl">
                    {playerData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-3 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" asChild className="w-full" disabled={isSaving} size="sm">
                    <span>
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {isSaving ? 'Uploading...' : 'Upload Image'}
                      </span>
                      <span className="sm:hidden">
                        {isSaving ? 'Uploading...' : 'Upload'}
                      </span>
                      </span>
                    </Button>
                  </Label>
                  
                  <Button 
                    variant="outline" 
                    onClick={generateRandomAvatar}
                    disabled={isGeneratingAvatar}
                    size="sm"
                  >
                    <Shuffle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {isGeneratingAvatar ? 'Generating...' : <><span className="hidden sm:inline">Random Avatar</span><span className="sm:hidden">Random</span></>}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={generateImageToImageAvatar}
                    disabled={isGeneratingAvatar || !canTransformAvatar()}
                    size="sm"
                  >
                    <Wand2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {isGeneratingAvatar ? 'Generating...' : <><span className="hidden sm:inline">AI Transform</span><span className="sm:hidden">AI</span></>}
                  </Button>
                </div>
                
                <Input
                  key={fileInputKey}
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Upload your photo, generate random avatar, or transform uploaded images into cartoons
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself and your football journey..."
              value={profile.bio || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="position">Favorite Position</Label>
              <Select
                value={profile.favorite_position || ''}
                onValueChange={(value) => setProfile(prev => ({ ...prev, favorite_position: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {FOOTBALL_POSITIONS.map(position => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="years">Years Playing</Label>
              <Input
                id="years"
                type="number"
                placeholder="Years of experience"
                value={profile.years_playing || ''}
                onChange={(e) => setProfile(prev => ({ 
                  ...prev, 
                  years_playing: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="club">Favorite Club</Label>
              <Input
                id="club"
                placeholder="e.g. Real Madrid, Barcelona, Man United"
                value={profile.favorite_club || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, favorite_club: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Player Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>PAC - Pace</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.pace || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, pace: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.pace || 50}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>SHO - Shooting</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.shooting || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, shooting: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.shooting || 50}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>PAS - Passing</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.passing || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, passing: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.passing || 50}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>DRI - Dribbling</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.dribbling || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, dribbling: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.dribbling || 50}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>DEF - Defending</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.defending || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, defending: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.defending || 50}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>PHY - Physical</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.skill_ratings?.physical || 50]}
                  onValueChange={(value) => setProfile(prev => ({
                    ...prev,
                    skill_ratings: { ...prev.skill_ratings!, physical: value[0] }
                  }))}
                  max={100}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-center">{profile.skill_ratings?.physical || 50}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Quirks */}
      <Card>
        <CardHeader>
          <CardTitle>Player Quirks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {profile.football_skills?.map((skill, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="space-y-2">
            <Label>Add Quirks</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Custom quirk..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill(newSkill)}
              />
              <Button onClick={() => addSkill(newSkill)} disabled={!newSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {FUNNY_SKILLS.map(skill => (
                <Button
                  key={skill}
                  variant="outline"
                  size="sm"
                  onClick={() => addSkill(skill)}
                  disabled={profile.football_skills?.includes(skill)}
                >
                  {skill}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ProfileSkillsEditor.displayName = 'ProfileSkillsEditor';

export default ProfileSkillsEditor;