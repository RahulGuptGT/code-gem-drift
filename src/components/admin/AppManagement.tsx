import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Smartphone, Eye, EyeOff, Upload, FileArchive, Image, X } from 'lucide-react';
import { z } from 'zod';
import { UniversalLoader, UniversalSpinner } from "@/components/ui/UniversalLoader";

interface AppInfo {
  id: string;
  app_name: string;
  app_description: string | null;
  package_name: string | null;
  version: string | null;
  download_url: string | null;
  play_store_url: string | null;
  app_icon_url: string | null;
  screenshots: string[];
  features: string[];
  is_visible: boolean;
}

const appSchema = z.object({
  app_name: z.string().min(1, "App name is required").max(100),
  app_description: z.string().max(1000).optional(),
  package_name: z.string().max(100).optional(),
  version: z.string().max(20).optional(),
  download_url: z.string().url().optional().or(z.literal('')),
  play_store_url: z.string().url().optional().or(z.literal('')),
  app_icon_url: z.string().url().optional().or(z.literal('')),
});

export default function AppManagement() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    app_name: '',
    app_description: '',
    package_name: '',
    version: '',
    download_url: '',
    play_store_url: '',
    app_icon_url: '',
    features: '',
    screenshots: '',
  });

  const handleFileUpload = async (
    file: File, 
    type: 'apk' | 'icon' | 'screenshot',
    setLoading: (v: boolean) => void
  ) => {
    const maxSize = type === 'apk' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${type === 'apk' ? '100MB' : '10MB'}`);
      return null;
    }

    setLoading(true);
    try {
      const fileName = `${type}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { data, error } = await supabase.storage
        .from('app-files')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      // Buckets are private; serve through the site's public file proxy.
      return `/api/public/file/app-files/${data.path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.apk')) {
      toast.error('Please select an APK file');
      return;
    }
    const url = await handleFileUpload(file, 'apk', setIsUploading);
    if (url) {
      setFormData({ ...formData, download_url: url });
      toast.success('APK uploaded!');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const url = await handleFileUpload(file, 'icon', setIsUploadingIcon);
    if (url) {
      setFormData({ ...formData, app_icon_url: url });
      toast.success('Icon uploaded!');
    }
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingScreenshot(true);
    const urls: string[] = [];
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const url = await handleFileUpload(file, 'screenshot', () => {});
      if (url) urls.push(url);
    }
    
    if (urls.length > 0) {
      const existing = formData.screenshots ? formData.screenshots.split('\n').filter(s => s.trim()) : [];
      setFormData({ ...formData, screenshots: [...existing, ...urls].join('\n') });
      toast.success(`${urls.length} screenshot(s) uploaded!`);
    }
    setIsUploadingScreenshot(false);
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('app_info')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch apps');
    } else {
      const typedData = (data || []).map(app => ({
        ...app,
        screenshots: Array.isArray(app.screenshots) 
          ? (app.screenshots as unknown as string[]).filter(s => typeof s === 'string') 
          : [],
        features: Array.isArray(app.features) 
          ? (app.features as unknown as string[]).filter(f => typeof f === 'string') 
          : []
      }));
      setApps(typedData);
    }
    setIsLoading(false);
  };

  const openEditDialog = (app: AppInfo) => {
    setEditingApp(app);
    setFormData({
      app_name: app.app_name,
      app_description: app.app_description || '',
      package_name: app.package_name || '',
      version: app.version || '',
      download_url: app.download_url || '',
      play_store_url: app.play_store_url || '',
      app_icon_url: app.app_icon_url || '',
      features: app.features.join('\n'),
      screenshots: app.screenshots.join('\n'),
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingApp(null);
    setFormData({
      app_name: '',
      app_description: '',
      package_name: '',
      version: '',
      download_url: '',
      play_store_url: '',
      app_icon_url: '',
      features: '',
      screenshots: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const validation = appSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);

      const appData = {
        app_name: formData.app_name.trim(),
        app_description: formData.app_description.trim() || null,
        package_name: formData.package_name.trim() || null,
        version: formData.version.trim() || null,
        download_url: formData.download_url.trim() || null,
        play_store_url: formData.play_store_url.trim() || null,
        app_icon_url: formData.app_icon_url.trim() || null,
        features: formData.features.split('\n').filter(f => f.trim()),
        screenshots: formData.screenshots.split('\n').filter(s => s.trim()),
      };

      if (editingApp) {
        const { error } = await supabase
          .from('app_info')
          .update(appData)
          .eq('id', editingApp.id);

        if (error) throw error;
        toast.success('App updated!');
      } else {
        const { error } = await supabase
          .from('app_info')
          .insert(appData);

        if (error) throw error;
        toast.success('App added!');
      }

      setIsDialogOpen(false);
      fetchApps();
    } catch (err) {
      toast.error('Failed to save app');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (app: AppInfo) => {
    const { error } = await supabase
      .from('app_info')
      .update({ is_visible: !app.is_visible })
      .eq('id', app.id);

    if (error) {
      toast.error('Failed to update visibility');
    } else {
      toast.success(app.is_visible ? 'App hidden' : 'App visible');
      fetchApps();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;

    const { error } = await supabase
      .from('app_info')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete app');
    } else {
      toast.success('App deleted');
      fetchApps();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">App Management</h1>
          <p className="text-muted-foreground">Manage your Android apps showcase</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingApp ? 'Edit App' : 'Add New App'}</DialogTitle>
              <DialogDescription>
                {editingApp ? 'Update app details' : 'Add a new Android app to showcase'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="app_name">App Name *</Label>
                <Input
                  id="app_name"
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  placeholder="My Awesome App"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_description">Description</Label>
                <Textarea
                  id="app_description"
                  value={formData.app_description}
                  onChange={(e) => setFormData({ ...formData, app_description: e.target.value })}
                  placeholder="A brief description of your app..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_name">Package Name</Label>
                  <Input
                    id="package_name"
                    value={formData.package_name}
                    onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                    placeholder="com.example.app"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>App Icon</Label>
                <div className="flex gap-2">
                  <Input
                    id="app_icon_url"
                    value={formData.app_icon_url}
                    onChange={(e) => setFormData({ ...formData, app_icon_url: e.target.value })}
                    placeholder="URL or upload icon"
                    className="flex-1"
                  />
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                  >
                    {isUploadingIcon ? (
                      <UniversalSpinner size={16} />
                    ) : (
                      <Image className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.app_icon_url && (
                  <div className="flex items-center gap-2 mt-2">
                    <img src={formData.app_icon_url} alt="Icon preview" className="w-10 h-10 rounded-lg object-cover" />
                    <Button variant="ghost" size="icon" onClick={() => setFormData({ ...formData, app_icon_url: '' })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="play_store_url">Play Store URL</Label>
                <Input
                  id="play_store_url"
                  value={formData.play_store_url}
                  onChange={(e) => setFormData({ ...formData, play_store_url: e.target.value })}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
              </div>
              <div className="space-y-2">
                <Label>APK File</Label>
                <div className="flex gap-2">
                  <Input
                    id="download_url"
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="URL or upload APK file"
                    className="flex-1"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".apk"
                    onChange={handleApkUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <UniversalSpinner size={16} />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.download_url && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileArchive className="h-3 w-3" />
                    APK ready for download
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Screenshots</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="screenshots"
                    value={formData.screenshots}
                    onChange={(e) => setFormData({ ...formData, screenshots: e.target.value })}
                    placeholder="URLs (one per line) or upload images"
                    rows={3}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-1">
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => screenshotInputRef.current?.click()}
                      disabled={isUploadingScreenshot}
                    >
                      {isUploadingScreenshot ? (
                        <UniversalSpinner size={16} />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {formData.screenshots && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.screenshots.split('\n').filter(s => s.trim()).map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-16 h-28 rounded object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const urls = formData.screenshots.split('\n').filter(s => s.trim());
                            urls.splice(i, 1);
                            setFormData({ ...formData, screenshots: urls.join('\n') });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.app_name.trim()}>
                {isSubmitting ? 'Saving...' : editingApp ? 'Update' : 'Add App'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            All Apps
          </CardTitle>
          <CardDescription>
            {apps.length} app{apps.length !== 1 ? 's' : ''} in showcase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <UniversalLoader />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No apps yet</p>
              <p className="text-sm">Add your first Android app above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead className="hidden md:table-cell">Version</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {app.app_icon_url ? (
                            <img 
                              src={app.app_icon_url} 
                              alt={app.app_name}
                              className="w-10 h-10 rounded-lg"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Smartphone className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{app.app_name}</p>
                            {app.package_name && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {app.package_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {app.version ? (
                          <Badge variant="secondary">v{app.version}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(app)}
                          className={app.is_visible ? 'text-green-600' : 'text-muted-foreground'}
                        >
                          {app.is_visible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(app)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(app.id)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}