/**
 * Minimal react-router-dom compatibility layer built on TanStack Router.
 * Vite aliases "react-router-dom" to this module so the ported pages/components
 * keep working without a rewrite.
 */
import {
  useRouter,
  useLocation as useTanstackLocation,
  useParams as useTanstackParams,
} from "@tanstack/react-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

type To = string;

function isModifiedEvent(e: MouseEvent<HTMLAnchorElement>) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: To;
  replace?: boolean;
  state?: unknown;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, onClick, target, ...rest },
  ref,
) {
  const router = useRouter();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      isModifiedEvent(e) ||
      (target && target !== "_self") ||
      /^([a-z]+:)?\/\//i.test(to) ||
      to.startsWith("mailto:") ||
      to.startsWith("tel:")
    ) {
      return;
    }
    e.preventDefault();
    router.navigate({ href: to, replace, state: state as never });
  };
  return <a ref={ref} href={to} target={target} onClick={handleClick} {...rest} />;
});

export const NavLink = Link;

export function useLocation() {
  const loc = useTanstackLocation();
  return useMemo(
    () => ({
      pathname: loc.pathname,
      search: loc.searchStr ? (loc.searchStr.startsWith("?") ? loc.searchStr : `?${loc.searchStr}`) : "",
      hash: loc.hash ? (loc.hash.startsWith("#") ? loc.hash : `#${loc.hash}`) : "",
      state: ((loc.state ?? {}) as unknown) as Record<string, unknown>,
      key: loc.href,
    }),
    [loc],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useTanstackParams({ strict: false }) as unknown as T;
}

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: To | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      router.navigate({ href: to, replace: options?.replace, state: options?.state as never });
    },
    [router],
  );
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => void,
] {
  const router = useRouter();
  const loc = useTanstackLocation();
  const params = useMemo(() => new URLSearchParams(loc.searchStr ?? ""), [loc.searchStr]);
  const setParams = useCallback(
    (next: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => {
      const sp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
      const qs = sp.toString();
      router.navigate({
        href: `${loc.pathname}${qs ? `?${qs}` : ""}`,
        replace: options?.replace,
      });
    },
    [router, loc.pathname],
  );
  return [params, setParams];
}

export function Navigate({ to, replace }: { to: To; replace?: boolean; state?: unknown }) {
  const router = useRouter();
  useEffect(() => {
    router.navigate({ href: to, replace });
  }, [router, to, replace]);
  return null;
}

export function matchPath(
  pattern: string | { path: string; end?: boolean },
  pathname: string,
): { params: Record<string, string>; pathname: string } | null {
  const path = typeof pattern === "string" ? pattern : pattern.path;
  const end = typeof pattern === "string" ? true : pattern.end !== false;
  const keys: string[] = [];
  const source = path
    .replace(/\/\*$/, "(?:/(?<splat>.*))?")
    .replace(/:([A-Za-z0-9_]+)/g, (_m, k: string) => {
      keys.push(k);
      return "([^/]+)";
    });
  const regex = new RegExp(`^${source}${end ? "$" : ""}`);
  const match = pathname.match(regex);
  if (!match) return null;
  const params: Record<string, string> = {};
  keys.forEach((k, i) => {
    params[k] = decodeURIComponent(match[i + 1] ?? "");
  });
  return { params, pathname: match[0] };
}

export function useHref(to: To) {
  return to;
}
