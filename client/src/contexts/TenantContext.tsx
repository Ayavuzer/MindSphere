import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings?: any;
  plan?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TenantMembership {
  tenant: Tenant;
  role: string;
  status: string;
  joinedAt: Date;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: TenantMembership[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  createTenant: (data: { name: string; slug: string }) => Promise<Tenant>;
  refreshTenants: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const queryClient = useQueryClient();
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    localStorage.getItem('currentTenantId')
  );

  // Fetch user's tenants
  const { data: userTenants = [], isLoading } = useQuery<TenantMembership[]>({
    queryKey: ['/api/tenants'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current tenant from userTenants
  const currentTenant = userTenants.find(
    membership => membership.tenant.id === currentTenantId
  )?.tenant || userTenants[0]?.tenant || null;

  // Update current tenant if not set or invalid
  useEffect(() => {
    if (userTenants.length > 0 && (!currentTenantId || !currentTenant)) {
      const firstTenant = userTenants[0].tenant;
      setCurrentTenantId(firstTenant.id);
      localStorage.setItem('currentTenantId', firstTenant.id);
    }
  }, [userTenants, currentTenantId, currentTenant]);

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tenant');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
    },
  });

  const switchTenant = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    localStorage.setItem('currentTenantId', tenantId);
    
    // Invalidate all queries to refresh data for new tenant
    queryClient.invalidateQueries();
  };

  const createTenant = async (data: { name: string; slug: string }): Promise<Tenant> => {
    return createTenantMutation.mutateAsync(data);
  };

  const refreshTenants = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
  };

  const value: TenantContextType = {
    currentTenant,
    userTenants,
    isLoading,
    switchTenant,
    createTenant,
    refreshTenants,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export type { Tenant, TenantMembership, TenantContextType };