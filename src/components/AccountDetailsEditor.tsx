import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Mail, Lock, Eye, EyeOff, Banknote, TrendingDown, TrendingUp, PoundSterling } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AccountDetailsEditorProps {
  userEmail: string;
  debt?: number;
  credit?: number;
  onCreditUpdate?: () => void;
}

const AccountDetailsEditor = ({ userEmail, debt = 0, credit = 0, onCreditUpdate }: AccountDetailsEditorProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [email, setEmail] = useState(userEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [isAddingCredit, setIsAddingCredit] = useState(false);

  const handleEmailUpdate = async () => {
    if (email === userEmail) {
      toast({
        title: "No changes",
        description: "Email address is the same as current",
        variant: "default",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      
      if (error) throw error;

      toast({
        title: "Email update initiated",
        description: "Check your new email address for a confirmation link",
      });
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || isNaN(amount)) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsAddingCredit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({ credit: credit + amount })
        .eq('user_id', user.id);
      
      if (error) throw error;

      toast({
        title: "Credit updated",
        description: amount > 0 
          ? `£${amount.toFixed(2)} added to your account`
          : `£${Math.abs(amount).toFixed(2)} deducted from your account`,
      });
      
      setCreditAmount('');
      onCreditUpdate?.();
    } catch (error: any) {
      console.error('Error adding credit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credit",
        variant: "destructive",
      });
    } finally {
      setIsAddingCredit(false);
    }
  };

  const netBalance = credit - debt;

  return (
    <div className="space-y-6">
      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              £{debt.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Amount owed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              £{credit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PoundSterling className="h-4 w-4" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              £{Math.abs(netBalance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {netBalance >= 0 ? 'Surplus' : 'Outstanding'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

        {/* Add Credit Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Update Credit
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Enter amount (+ or -)"
              className="flex-1"
            />
            <Button
              onClick={handleAddCredit}
              disabled={isAddingCredit || !creditAmount}
              className="bg-green-600 hover:bg-green-700"
            >
              Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add positive amount to increase credit, or negative to decrease (e.g., -5 to deduct £5)
          </p>
        </div>

        {/* Email Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter new email address"
              className="flex-1"
            />
            <Button
              onClick={handleEmailUpdate}
              disabled={isUpdating || email === userEmail}
              variant="outline"
            >
              Update Email
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current email: {userEmail}
          </p>
        </div>

        {/* Password Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </Label>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              onClick={handlePasswordUpdate}
              disabled={isUpdating || !newPassword || !confirmPassword}
              className="w-full"
            >
              Update Password
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters long
          </p>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDetailsEditor;