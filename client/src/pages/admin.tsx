import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Crown,
  Shield,
  User,
  Users,
  Trash2,
  Edit,
  Search,
  BarChart3,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  globalRole: 'user' | 'admin' | 'superadmin';
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  superAdminUsers: number;
  regularUsers: number;
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>('');

  // Check if user has admin privileges
  if (!user || (user.globalRole !== 'admin' && user.globalRole !== 'superadmin')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Yetkisiz Erişim</h1>
              <p className="text-gray-600">Bu sayfaya erişim için admin yetkilerine sahip olmanız gerekiyor.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.globalRole === 'superadmin', // Only superadmin can see all users
  });

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: user?.globalRole === 'superadmin',
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, globalRole }: { userId: string; globalRole: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalRole }),
      });
      if (!response.ok) throw new Error('Failed to update user role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Başarılı",
        description: "Kullanıcı rolü başarıyla güncellendi",
      });
      setShowRoleDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || 'Rol güncellenirken hata oluştu',
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla silindi",
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || 'Kullanıcı silinirken hata oluştu',
        variant: "destructive",
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Kullanıcı';
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.globalRole === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (user: AdminUser) => {
    setSelectedUser(user);
    setNewRole(user.globalRole);
    setShowRoleDialog(true);
  };

  const handleDeleteUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Kullanıcı yönetimi ve sistem istatistikleri</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          {getRoleIcon(user.globalRole || 'user')}
          {getRoleLabel(user.globalRole || 'user')}
        </Badge>
      </div>

      {/* Stats Cards - Only for superadmin */}
      {user.globalRole === 'superadmin' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Kullanıcılar</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admin</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.superAdminUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ay Yeni</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userGrowth.thisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Geçen ay: {stats.userGrowth.lastMonth}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management - Only for superadmin */}
      {user.globalRole === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Yönetimi</CardTitle>
            <CardDescription>
              Sistem kullanıcılarını görüntüleyebilir, rollerini değiştirebilir ve silebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Kullanıcı ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Rol filtresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Roller</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="text-center py-8">Kullanıcılar yükleniyor...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell>
                        <div className="font-medium">
                          {userData.firstName || userData.lastName 
                            ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
                            : 'İsimsiz Kullanıcı'
                          }
                        </div>
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userData.globalRole)} className="flex items-center gap-1 w-fit">
                          {getRoleIcon(userData.globalRole)}
                          {getRoleLabel(userData.globalRole)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(userData.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(userData)}
                            disabled={userData.id === user.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(userData)}
                            disabled={userData.id === user.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* For regular admins, show limited functionality */}
      {user.globalRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Paneli</CardTitle>
            <CardDescription>
              Admin olarak, tenant yönetimi ve genel sistem ayarlarına erişebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Kullanıcı yönetimi özelliklerine erişim için Super Admin yetkilerine ihtiyacınız var.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı Rolü Değiştir</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.email} kullanıcısının rolünü değiştirmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Yeni rol seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Kullanıcı</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && updateRoleMutation.mutate({ 
                userId: selectedUser.id, 
                globalRole: newRole 
              })}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.email} kullanıcısını silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}