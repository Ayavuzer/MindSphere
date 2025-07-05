import React, { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Check,
  Users,
  Crown,
  Shield,
  User
} from 'lucide-react';

const roleIcons = {
  owner: <Crown className="h-3 w-3 text-yellow-500" />,
  admin: <Shield className="h-3 w-3 text-blue-500" />,
  member: <User className="h-3 w-3 text-gray-500" />,
  viewer: <Users className="h-3 w-3 text-gray-400" />,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin', 
  member: 'Member',
  viewer: 'Viewer',
};

export function TenantSwitcher() {
  const { currentTenant, userTenants, isLoading, switchTenant, createTenant } = useTenant();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleTenantSwitch = (tenantId: string) => {
    switchTenant(tenantId);
    toast({
      title: "Tenant switched",
      description: "Successfully switched to the selected workspace.",
    });
  };

  const handleCreateTenant = async () => {
    if (!newTenantName.trim() || !newTenantSlug.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate slug format
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
      const newTenant = await createTenant({
        name: newTenantName,
        slug: newTenantSlug,
      });

      // Switch to the new tenant
      switchTenant(newTenant.id);

      toast({
        title: "Workspace created",
        description: `Successfully created and switched to "${newTenantName}".`,
      });

      // Reset form and close dialog
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
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
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" size="sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentTenant.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Workspaces</span>
            <Badge variant="secondary" className="text-xs">
              {userTenants.length}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {userTenants.map((membership) => (
          <DropdownMenuItem
            key={membership.tenant.id}
            onClick={() => handleTenantSwitch(membership.tenant.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{membership.tenant.name}</span>
                  {currentTenant.id === membership.tenant.id && (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {roleIcons[membership.role as keyof typeof roleIcons]}
                  <span>{roleLabels[membership.role as keyof typeof roleLabels]}</span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </DropdownMenuItem>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}