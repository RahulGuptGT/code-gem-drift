import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Monitor, Mail, Phone, User, Clock, MapPin, Cpu, Battery, Wifi, MousePointerClick, Copy as CopyIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Profile {
  id: string;
  visitor_id: string;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
  ip_address: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  timezone: string | null;
  device_fingerprint_hash: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  gpu_vendor: string | null;
  gpu_renderer: string | null;
  cpu_cores: number | null;
  device_memory_gb: number | null;
  screen_resolution: string | null;
  viewport: string | null;
  languages: string[] | null;
  touch_support: boolean | null;
  battery_level: number | null;
  battery_charging: boolean | null;
  network_type: string | null;
  network_downlink: number | null;
  captured_emails: string[] | null;
  captured_phones: string[] | null;
  captured_names: string[] | null;
  total_time_seconds: number;
  total_clicks: number;
  total_pageviews: number;
  rage_click_count: number;
}

interface BehaviorEvent {
  id: string;
  event_type: string;
  page_path: string | null;
  data: any;
  created_at: string;
}

interface FormCapture {
  id: string;
  field_name: string;
  field_type: string;
  value: string;
  page_path: string | null;
  created_at: string;
}

function flagFromCC(cc: string | null): string {
  if (!cc || cc.length !== 2) return '🌍';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export default function VisitorProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with_email' | 'with_phone'>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [behavior, setBehavior] = useState<BehaviorEvent[]>([]);
  const [captures, setCaptures] = useState<FormCapture[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('analytics_visitor_profiles' as any)
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(500);
      setProfiles((data as any) || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [b, c] = await Promise.all([
        supabase
          .from('analytics_behavior_events' as any)
          .select('*')
          .eq('visitor_id', selected.visitor_id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('analytics_form_captures' as any)
          .select('*')
          .eq('visitor_id', selected.visitor_id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setBehavior((b.data as any) || []);
      setCaptures((c.data as any) || []);
    })();
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter(p => {
      if (filter === 'with_email' && !(p.captured_emails?.length)) return false;
      if (filter === 'with_phone' && !(p.captured_phones?.length)) return false;
      if (!q) return true;
      return (
        p.visitor_id?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q) ||
        p.ip_address?.toLowerCase().includes(q) ||
        p.captured_emails?.some(e => e.toLowerCase().includes(q)) ||
        p.captured_phones?.some(e => e.toLowerCase().includes(q)) ||
        p.captured_names?.some(e => e.toLowerCase().includes(q))
      );
    });
  }, [profiles, search, filter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Visitor Profiles</h1>
        <p className="text-sm text-muted-foreground">
          Deep profile of every visitor: IP, geo, device, behavior, and captured form data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search by email, name, IP, city, country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'with_email' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('with_email')}>Has Email</Button>
          <Button variant={filter === 'with_phone' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('with_phone')}>Has Phone</Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} of {profiles.length} visitors</div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(p => (
            <Card
              key={p.id}
              className="p-3 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setSelected(p)}
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="text-2xl">{flagFromCC(p.country_code)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.city || 'Unknown'}, {p.country || '—'}</span>
                    <Badge variant="outline" className="text-xs">{p.visitor_id.substring(0, 8)}</Badge>
                    {p.visit_count > 1 && <Badge className="text-xs">Returning ({p.visit_count})</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span>{p.ip_address}</span>
                    <span>{p.browser} / {p.os}</span>
                    <span>{p.total_pageviews} views · {p.total_clicks} clicks</span>
                    <span>Last seen {formatDistanceToNow(new Date(p.last_seen_at))} ago</span>
                  </div>
                  {(p.captured_emails?.length || p.captured_phones?.length || p.captured_names?.length) ? (
                    <div className="mt-2 flex gap-2 flex-wrap text-xs">
                      {p.captured_emails?.slice(0, 2).map(e => <Badge key={e} variant="secondary"><Mail className="h-3 w-3 mr-1" />{e}</Badge>)}
                      {p.captured_phones?.slice(0, 2).map(e => <Badge key={e} variant="secondary"><Phone className="h-3 w-3 mr-1" />{e}</Badge>)}
                      {p.captured_names?.slice(0, 2).map(e => <Badge key={e} variant="secondary"><User className="h-3 w-3 mr-1" />{e}</Badge>)}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">No visitors match your filters yet.</Card>
          )}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {flagFromCC(selected.country_code)} {selected.city || 'Unknown'}, {selected.country || '—'}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                {/* Identity */}
                <Card className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><Globe className="h-4 w-4" /> Identity & Location</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">IP:</span> {selected.ip_address || '—'}</div>
                    <div><span className="text-muted-foreground">ISP:</span> {selected.isp || '—'}</div>
                    <div><span className="text-muted-foreground">Org:</span> {selected.org || '—'}</div>
                    <div><span className="text-muted-foreground">ASN:</span> {selected.asn || '—'}</div>
                    <div><span className="text-muted-foreground">Region:</span> {selected.region || '—'}</div>
                    <div><span className="text-muted-foreground">Postal:</span> {selected.postal_code || '—'}</div>
                    <div><span className="text-muted-foreground">Timezone:</span> {selected.timezone || '—'}</div>
                    <div><span className="text-muted-foreground">Visitor ID:</span> {selected.visitor_id.substring(0, 12)}</div>
                  </div>
                  {selected.latitude && selected.longitude && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}&zoom=12`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> View on map ({selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)})
                    </a>
                  )}
                </Card>

                {/* Captured PII */}
                {(selected.captured_emails?.length || selected.captured_phones?.length || selected.captured_names?.length) ? (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Captured Form Data</h3>
                    <div className="space-y-2 text-sm">
                      {selected.captured_emails?.length ? <div><span className="text-muted-foreground">Emails:</span> {selected.captured_emails.join(', ')}</div> : null}
                      {selected.captured_phones?.length ? <div><span className="text-muted-foreground">Phones:</span> {selected.captured_phones.join(', ')}</div> : null}
                      {selected.captured_names?.length ? <div><span className="text-muted-foreground">Names:</span> {selected.captured_names.join(', ')}</div> : null}
                    </div>
                  </Card>
                ) : null}

                {/* Device */}
                <Card className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><Monitor className="h-4 w-4" /> Device</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> {selected.device_type || '—'}</div>
                    <div><span className="text-muted-foreground">Browser:</span> {selected.browser || '—'}</div>
                    <div><span className="text-muted-foreground">OS:</span> {selected.os || '—'}</div>
                    <div><span className="text-muted-foreground">Screen:</span> {selected.screen_resolution || '—'}</div>
                    <div><span className="text-muted-foreground">Viewport:</span> {selected.viewport || '—'}</div>
                    <div><span className="text-muted-foreground">Touch:</span> {selected.touch_support ? 'Yes' : 'No'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">GPU:</span> {selected.gpu_renderer || '—'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Languages:</span> {selected.languages?.join(', ') || '—'}</div>
                    <div className="col-span-2 break-all"><span className="text-muted-foreground">User Agent:</span> <span className="text-xs">{selected.user_agent || '—'}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {selected.cpu_cores ?? '—'} cores</div>
                    <div className="flex items-center gap-1"><Battery className="h-3 w-3" /> {selected.battery_level != null ? `${Math.round(selected.battery_level * 100)}%` : '—'}{selected.battery_charging ? ' ⚡' : ''}</div>
                    <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /> {selected.network_type || '—'}</div>
                  </div>
                </Card>

                {/* Behavior */}
                <Card className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><MousePointerClick className="h-4 w-4" /> Behavior</h3>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                    <div><div className="font-bold text-lg">{selected.total_pageviews}</div><div className="text-xs text-muted-foreground">Views</div></div>
                    <div><div className="font-bold text-lg">{selected.total_clicks}</div><div className="text-xs text-muted-foreground">Clicks</div></div>
                    <div><div className="font-bold text-lg">{Math.round(selected.total_time_seconds / 60)}m</div><div className="text-xs text-muted-foreground">Time</div></div>
                    <div><div className="font-bold text-lg text-destructive">{selected.rage_click_count}</div><div className="text-xs text-muted-foreground">Rage</div></div>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {behavior.map(e => (
                      <div key={e.id} className="text-xs flex justify-between gap-2 border-b py-1">
                        <span className="font-mono">{e.event_type}</span>
                        <span className="text-muted-foreground truncate">{e.page_path}</span>
                        <span className="text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(e.created_at))} ago</span>
                      </div>
                    ))}
                    {behavior.length === 0 && <p className="text-xs text-muted-foreground">No events recorded.</p>}
                  </div>
                </Card>

                {/* Form captures log */}
                {captures.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-3"><CopyIcon className="h-4 w-4" /> Form Capture Log</h3>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {captures.map(c => (
                        <div key={c.id} className="text-xs border-b py-1">
                          <div className="flex justify-between gap-2">
                            <span><Badge variant="outline" className="text-xs mr-1">{c.field_type}</Badge>{c.value}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                          </div>
                          <div className="text-muted-foreground">{c.field_name} on {c.page_path}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="text-xs text-muted-foreground flex items-center gap-1 pb-4">
                  <Clock className="h-3 w-3" /> First seen {formatDistanceToNow(new Date(selected.first_seen_at))} ago · {selected.visit_count} total visits
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
