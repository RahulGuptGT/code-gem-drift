import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, MapPin, Instagram, Youtube, Facebook, Twitter } from "lucide-react";import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { UniversalSpinner } from "@/components/ui/UniversalLoader";

interface Setting {
  key: string;
  value: string;
  category: string;
  label: string;
  icon: any;
}

const SiteSettingsManagement = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const settingsConfig = [
    { key: 'contact_email', label: 'Email Address', category: 'contact', icon: Mail },
    { key: 'contact_whatsapp', label: 'WhatsApp Number', category: 'contact', icon: Phone },
    { key: 'contact_location', label: 'Location', category: 'contact', icon: MapPin },
    { key: 'social_instagram', label: 'Instagram URL', category: 'social', icon: Instagram },
    { key: 'social_youtube', label: 'YouTube URL', category: 'social', icon: Youtube },
    { key: 'social_facebook', label: 'Facebook URL', category: 'social', icon: Facebook },
    { key: 'social_twitter', label: 'Twitter/X URL', category: 'social', icon: Twitter },
    { key: 'social_email', label: 'Contact Email Link', category: 'social', icon: Mail },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      const mappedSettings = settingsConfig.map(config => {
        const dbSetting = data?.find(d => d.key === config.key);
        return {
          key: config.key,
          value: dbSetting?.value || '',
          category: config.category,
          label: config.label,
          icon: config.icon
        };
      });

      setSettings(mappedSettings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each setting
      for (const setting of settings) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            category: setting.category
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <UniversalSpinner size={32} />
      </div>
    );
  }

  const contactSettings = settings.filter(s => s.category === 'contact');
  const socialSettings = settings.filter(s => s.category === 'social');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Site Settings</h2>
        <p className="text-muted-foreground">Manage appearance, contact information and social media links</p>
      </div>

      <AppearanceSection />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Update your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contactSettings.map((setting) => {
              const Icon = setting.icon;
              return (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {setting.label}
                  </Label>
                  <Input
                    id={setting.key}
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                    placeholder={setting.label}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Social Media Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>Update your social media profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {socialSettings.map((setting) => {
              const Icon = setting.icon;
              return (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {setting.label}
                  </Label>
                  <Input
                    id={setting.key}
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                    placeholder={setting.label}
                    type="url"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
        >
          {saving ? (
            <>
              <UniversalSpinner size={16} className="mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
};

export default SiteSettingsManagement;
