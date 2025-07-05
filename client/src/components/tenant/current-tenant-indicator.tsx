import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Shield, User, Users } from 'lucide-react';

const roleConfig = {
  owner: {
    icon: Crown,
    label: 'Owner',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  member: {
    icon: User,
    label: 'Member',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  viewer: {
    icon: Users,
    label: 'Viewer',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

interface CurrentTenantIndicatorProps {
  variant?: 'full' | 'compact' | 'badge-only';
  className?: string;
}

export function CurrentTenantIndicator({ 
  variant = 'full', 
  className = '' 
}: CurrentTenantIndicatorProps) {
  const { currentTenant, userTenants, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className={`animate-pulse flex items-center gap-2 ${className}`}>
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
        <div className="h-4 w-20 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No workspace selected
      </div>
    );
  }

  const membership = userTenants.find(m => m.tenant.id === currentTenant.id);
  const userRole = membership?.role || 'member';
  const roleInfo = roleConfig[userRole as keyof typeof roleConfig] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

  if (variant === 'badge-only') {
    return (
      <Badge 
        variant="outline" 
        className={`${roleInfo.color} ${className}`}
      >
        <RoleIcon className="h-3 w-3 mr-1" />
        {roleInfo.label}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Building2 className="h-4 w-4 text-gray-600" />
        <span className="font-medium truncate">{currentTenant.name}</span>
        <Badge 
          variant="outline" 
          className={`${roleInfo.color} text-xs`}
        >
          <RoleIcon className="h-2.5 w-2.5 mr-1" />
          {roleInfo.label}
        </Badge>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Building2 className="h-5 w-5 text-gray-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {currentTenant.name}
          </div>
          {currentTenant.slug && (
            <div className="text-xs text-gray-500 truncate">
              {currentTenant.slug}
            </div>
          )}
        </div>
      </div>
      <Badge 
        variant="outline" 
        className={roleInfo.color}
      >
        <RoleIcon className="h-3 w-3 mr-1" />
        {roleInfo.label}
      </Badge>
    </div>
  );
}