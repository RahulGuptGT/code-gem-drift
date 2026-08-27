import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Shield, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversalLoader } from "@/components/ui/UniversalLoader";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  email?: string;
}

export const SettingsManagement = () => {
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator' | 'user'>('user');

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');

      if (error) throw error;

      // Map roles without fetching emails for now (requires server-side admin API)
      const rolesWithEmails = (data || []).map((role) => ({
        ...role,
        email: 'User ID: ' + role.user_id.slice(0, 8) + '...'
      }));

      setUserRoles(rolesWithEmails);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user roles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newUserEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a user email',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Find user by email - Note: auth.admin is not available in client-side code
      // In production, this should be done via an edge function
      toast({
        title: 'Info',
        description: 'Please use the user ID directly for now. Admin API requires server-side implementation.',
        variant: 'destructive'
      });
      return;

      /*
      const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
      
      if (searchError) throw searchError;

      const user = users?.find(u => u.email === newUserEmail);

      if (!user) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive'
        });
        return;
      }

      // Add role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: newUserRole
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'User already has this role',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Success',
        description: `Role ${newUserRole} assigned to ${newUserEmail}`
      });

      setNewUserEmail('');
      fetchUserRoles();
      */
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: 'Failed to add role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (roleId: string, email: string) => {
    if (!confirm(`Remove role for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role removed successfully'
      });

      fetchUserRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage user roles and system configuration
        </p>
      </div>

      {/* User Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            Assign and manage user roles for the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Role */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add User Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">User Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Combobox
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'moderator', label: 'Moderator' },
                    { value: 'user', label: 'User' },
                  ]}
                  value={newUserRole}
                  onChange={(value: any) => setNewUserRole(value)}
                  placeholder="Select role..."
                  searchPlaceholder="Search role..."
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddRole} className="w-full">
                  Add Role
                </Button>
              </div>
            </div>
          </div>

          {/* User Roles Table */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current User Roles
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <UniversalLoader />
              </div>
            ) : userRoles.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No user roles found. Add users above to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-medium">{userRole.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(userRole.role)}>
                            {userRole.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {userRole.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(userRole.id, userRole.email || 'user')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            General system settings and configuration options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Additional system configuration options will be added here as needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
