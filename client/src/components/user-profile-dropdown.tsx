import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Settings,
  LogOut,
  Shield,
  Crown,
  ChevronDown,
} from 'lucide-react';

interface UserProfileDropdownProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function UserProfileDropdown({ 
  size = 'md', 
  showLabel = true 
}: UserProfileDropdownProps) {
  const { user, logout, isLoggingOut } = useAuth();
  const [, navigate] = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setShowLogoutDialog(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'default' as const;
      case 'admin':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (!user) {
    return null;
  }

  const userRole = user.globalRole || 'user';
  const displayName = user.firstName || user.email || 'User';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center space-x-3 p-2 h-auto hover:bg-gray-800/50"
          >
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.profileImageUrl || ''} alt="User" />
              <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500">
                <User className="text-white" size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />
              </AvatarFallback>
            </Avatar>
            
            {showLabel && (
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className={`font-medium text-white ${textSizes[size]}`}>
                    {displayName}
                  </p>
                  {getRoleIcon(userRole)}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs">
                    {getRoleLabel(userRole)}
                  </Badge>
                </div>
              </div>
            )}
            
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs">
                  {getRoleIcon(userRole)}
                  <span className="ml-1">{getRoleLabel(userRole)}</span>
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => navigate('/preferences')}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Ayarlar</span>
          </DropdownMenuItem>
          
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <DropdownMenuItem
              onClick={() => navigate('/admin')}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowLogoutDialog(true)}
            className="cursor-pointer text-red-600 focus:text-red-600"
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Çıkış yapmak istediğinizden emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem sizi uygulamadan çıkaracak ve giriş sayfasına yönlendirecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}