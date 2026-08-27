import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { UniversalTopBar } from "@/components/ui/UniversalLoader";

/**
 * Shows a thin animated top bar on every route change for ~600ms.
 * Mount once inside <BrowserRouter>.
 */
export function RouteLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 650);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  if (!visible) return null;
  return <UniversalTopBar />;
}

export default RouteLoader;
