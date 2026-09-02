import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink, Edit, Eye, EyeOff, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { uniqueChannel } from "@/lib/realtime";

interface ReferralLink {
  id: string;
  name: string;
  description: string;
  offer: string;
  category: string;
  logo: string;
  referral_link: string;
  bg_color: string;
  text_color: string;
  is_visible: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export const ReferralLinksManagement = () => {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<ReferralLink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<ReferralLink | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    offer: '',
    category: '',
    logo: '',
    referral_link: '',
    bg_color: 'bg-gray-50 border-gray-200',
    text_color: 'text-gray-700',
    is_visible: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchLinks();
    subscribeToChanges();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLinks(links);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLinks(links.filter(link => 
        link.name.toLowerCase().includes(query) ||
        link.category.toLowerCase().includes(query) ||
        link.description.toLowerCase().includes(query)
      ));
    }
  }, [searchQuery, links]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLinks((data || []) as any);
    } catch (error) {
      console.error('Error fetching referral links:', error);
      toast.error('Failed to fetch referral links');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(uniqueChannel("referral-links-changes"))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_links'
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      offer: '',
      category: '',
      logo: '',
      referral_link: '',
      bg_color: 'bg-gray-50 border-gray-200',
      text_color: 'text-gray-700',
      is_visible: true,
      display_order: links.length + 1,
    });
    setEditingLink(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLink) {
        // Update existing link
        const { error } = await supabase
          .from('referral_links')
          .update(formData)
          .eq('id', editingLink.id);

        if (error) throw error;
        toast.success('Referral link updated successfully');
      } else {
        // Insert new link
        const { error } = await supabase
          .from('referral_links')
          .insert([formData]);

        if (error) throw error;
        toast.success('Referral link added successfully');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving referral link:', error);
      toast.error('Failed to save referral link');
    }
  };

  const handleEdit = (link: ReferralLink) => {
    setEditingLink(link);
    setFormData({
      name: link.name,
      description: link.description,
      offer: link.offer,
      category: link.category,
      logo: link.logo,
      referral_link: link.referral_link,
      bg_color: link.bg_color,
      text_color: link.text_color,
      is_visible: link.is_visible,
      display_order: link.display_order,
    });
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;

    try {
      const { error } = await supabase
        .from('referral_links')
        .delete()
        .eq('id', linkToDelete);

      if (error) throw error;
      toast.success('Referral link deleted successfully');
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
    } catch (error) {
      console.error('Error deleting referral link:', error);
      toast.error('Failed to delete referral link');
    }
  };

  const toggleVisibility = async (link: ReferralLink) => {
    try {
      const { error } = await supabase
        .from('referral_links')
        .update({ is_visible: !link.is_visible })
        .eq('id', link.id);

      if (error) throw error;
      toast.success(`Link ${!link.is_visible ? 'shown' : 'hidden'}`);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const totalLinks = links.length;
  const activeLinks = links.filter(l => l.is_visible).length;
  const hiddenLinks = totalLinks - activeLinks;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Links</h1>
        <p className="text-muted-foreground">Manage your referral and affiliate links</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLinks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeLinks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hidden Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{hiddenLinks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingLink ? 'Edit Link' : 'Add New Link'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., PhonePe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., UPI Payment"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the app/service"
                rows={2}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">{formData.description.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer">Special Offer *</Label>
              <Textarea
                id="offer"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                placeholder="e.g., Get ₹100 cashback on first transaction"
                rows={2}
                maxLength={150}
                required
              />
              <p className="text-xs text-muted-foreground">{formData.offer.length}/150</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo (Emoji or URL) *</Label>
                <Input
                  id="logo"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="📱 or https://..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referral_link">Referral Link *</Label>
                <Input
                  id="referral_link"
                  type="url"
                  value={formData.referral_link}
                  onChange={(e) => setFormData({ ...formData, referral_link: e.target.value })}
                  placeholder="https://example.com/ref/xyz"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bg_color">Background Color (Tailwind)</Label>
                <Input
                  id="bg_color"
                  value={formData.bg_color}
                  onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                  placeholder="bg-purple-50 border-purple-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_color">Text Color (Tailwind)</Label>
                <Input
                  id="text_color"
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  placeholder="text-purple-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                />
                <Label htmlFor="is_visible">Visible on public page</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                {editingLink ? 'Update Link' : 'Add Link'}
              </Button>
              {editingLink && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Links List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Links ({filteredLinks.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No links found matching your search' : 'No referral links yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLinks.map((link) => (
                <Card key={link.id} className={`${link.bg_color}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 w-full">
                        <div className="text-3xl">{link.logo}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{link.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${link.text_color} bg-white/70`}>
                              {link.category}
                            </span>
                            {!link.is_visible && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{link.description}</p>
                          <p className="text-sm font-medium">{link.offer}</p>
                          <a
                            href={link.referral_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.referral_link}
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start sm:self-auto">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleVisibility(link)}
                          title={link.is_visible ? 'Hide' : 'Show'}
                        >
                          {link.is_visible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(link)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setLinkToDelete(link.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the referral link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLinkToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
