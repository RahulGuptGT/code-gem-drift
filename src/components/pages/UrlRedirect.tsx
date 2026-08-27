import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLoader } from "@/components/ui/UniversalLoader";
import Layout from '@/components/Layout';
import NotFound from '@/components/pages/NotFound';

function isValidRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default function UrlRedirect() {
  const { code } = useParams<{ code: string }>();
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const redirect = async () => {
      if (!code) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('short_urls')
        .select('original_url')
        .eq('short_code', code)
        .single();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Only block invalid protocols (e.g., javascript:) — allow any http/https domain
      if (!isValidRedirect(data.original_url)) {
        console.warn('Blocked redirect to invalid URL:', data.original_url);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      await supabase.functions.invoke('track-url-click', { body: { code } });
      window.location.href = data.original_url;
    };

    redirect();
  }, [code]);

  if (notFound) {
    return <Layout><NotFound /></Layout>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <UniversalLoader />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}
