import React, { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CurrentTenantIndicator } from '@/components/tenant/current-tenant-indicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Building2, 
  Plus, 
  Users, 
  Crown,
  Shield,
  User,
  Settings,
  Trash2,
  Edit,
  Copy,
  Check
} from 'lucide-react';

const roleIcons = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  member: <User className="h-4 w-4 text-gray-500" />,
  viewer: <Users className="h-4 w-4 text-gray-400" />,
};

export function TenantManagement() {
  const { currentTenant, userTenants, createTenant, refreshTenants } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Get current tenant membership info
  const currentMembership = userTenants.find(m => m.tenant.id === currentTenant?.id);
  const canManageWorkspace = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  const handleCreateTenant = async () => {
    if (!newTenantName.trim() || !newTenantSlug.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newTenantSlug)) {
      toast({
        title: "Invalid slug",
        description: "Slug can only contain lowercase letters, numbers, and hyphens.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createTenant({
        name: newTenantName,
        slug: newTenantSlug,
      });

      toast({
        title: "Workspace created",
        description: `Successfully created "${newTenantName}".`,
      });

      setNewTenantName('');
      setNewTenantSlug('');
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setNewTenantName(value);
    if (!newTenantSlug || newTenantSlug === generateSlug(newTenantName)) {
      setNewTenantSlug(generateSlug(value));
    }
  };

  const copySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
      toast({
        title: "Copied",
        description: "Workspace slug copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Workspace Management</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage your workspaces and collaborate with team members
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your data and collaborate with others.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tenant-name">Workspace Name</Label>
                <Input
                  id="tenant-name"
                  placeholder="My Company"
                  value={newTenantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tenant-slug">Workspace Slug</Label>
                <Input
                  id="tenant-slug"
                  placeholder="my-company"
                  value={newTenantSlug}
                  onChange={(e) => setNewTenantSlug(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs. Only lowercase letters, numbers, and hyphens allowed.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTenant} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Workspace */}
      {currentTenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Workspace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentTenantIndicator variant="full" />
            {canManageWorkspace && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>Your Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userTenants.map((membership, index) => (
              <div key={membership.tenant.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className="h-5 w-5 text-gray-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{membership.tenant.name}</h3>
                        {currentTenant?.id === membership.tenant.id && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <button
                          onClick={() => copySlug(membership.tenant.slug)}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          <span className="font-mono">{membership.tenant.slug}</span>
                          {copiedSlug === membership.tenant.slug ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {roleIcons[membership.role as keyof typeof roleIcons]}
                          <span className="capitalize">{membership.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {membership.role === 'owner' && (
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    {membership.role === 'owner' && userTenants.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{membership.tenant.name}"? This action cannot be undone and will permanently delete all data in this workspace.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                              Delete Workspace
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                {index < userTenants.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">About Workspaces</h3>
              <p className="text-sm text-blue-800 mb-3">
                Workspaces help you organize your data and collaborate with team members. Each workspace has its own data, settings, and member permissions.
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Owner</strong>: Full access including workspace deletion</li>
                <li>• <strong>Admin</strong>: Manage members and workspace settings</li>
                <li>• <strong>Member</strong>: Access all workspace features</li>
                <li>• <strong>Viewer</strong>: Read-only access to workspace data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}