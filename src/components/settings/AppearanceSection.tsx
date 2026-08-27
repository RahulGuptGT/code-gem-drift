import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the interface looks on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm font-medium">Theme</p>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2 max-w-md"
          >
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 min-h-[72px] transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
