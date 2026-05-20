import { NextRequest, NextResponse } from "next/server";

import { normalizeBrowseUrl } from "@/lib/browse-proxy";

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

function parseTarget(raw: string | null): URL | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(normalizeBrowseUrl(raw));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (host === "::1") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const parts = ipv4.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function proxyHref(href: string, target: URL): string {
  try {
    const absolute = new URL(href, target);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return href;
    }
    if (isBlockedHost(absolute.hostname)) return href;
    return `/api/browse?url=${encodeURIComponent(absolute.toString())}`;
  } catch {
    return href;
  }
}

function rewriteHtml(html: string, target: URL): string {
  const baseHref = `${target.origin}/`;
  const baseTag = `<base href="${baseHref}"><meta name="referrer" content="no-referrer">`;

  let out = html;
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  } else {
    out = `<head>${baseTag}</head>${out}`;
  }

  out = out.replace(
    /<a\b([^>]*?)\bhref=(["'])([^"']+)\2/gi,
    (match, attrs: string, quote: string, href: string) => {
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return match;
      }
      const proxied = proxyHref(href, target);
      return `<a${attrs}href=${quote}${proxied}${quote}`;
    }
  );

  out = out.replace(
    /<form\b([^>]*?)\baction=(["'])([^"']+)\2/gi,
    (match, attrs: string, quote: string, action: string) => {
      const proxied = proxyHref(action, target);
      return `<form${attrs}action=${quote}${proxied}${quote}`;
    }
  );

  const cursorBridge = `<script>
(function(){
  var last=0;
  document.addEventListener("mousemove",function(e){
    var now=Date.now();
    if(now-last<50)return;
    last=now;
    try{window.parent.postMessage({type:"onariam-sync-cursor",x:e.clientX,y:e.clientY},"*");}catch(_){}
  },{passive:true});
})();
</script>`;

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${cursorBridge}</body>`);
  } else {
    out += cursorBridge;
  }

  return out;
}

function errorHtml(message: string, target: URL | null) {
  const openUrl = target?.toString() ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #0f1011; color: #f7f8f8; }
    p { max-width: 36rem; line-height: 1.5; color: #d0d6e0; }
    a { color: #828fff; }
  </style>
</head>
<body>
  <h1>Could not load this page</h1>
  <p>${message}</p>
  ${
    openUrl
      ? `<p><a href="${openUrl}" target="_blank" rel="noopener noreferrer">Open in a new tab</a></p>`
      : ""
  }
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const target = parseTarget(request.nextUrl.searchParams.get("url"));
  if (!target) {
    return new NextResponse(errorHtml("Enter a valid http or https URL.", null), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; OnariamSync/1.0; +https://github.com/Samanthkumarsg/onariam-sync)",
      },
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return new NextResponse(
        errorHtml("This page is too large to embed.", target),
        { status: 413, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (!upstream.ok) {
      return new NextResponse(
        errorHtml(`The site responded with status ${upstream.status}.`, target),
        {
          status: upstream.status,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    if (!contentType.includes("text/html")) {
      return NextResponse.redirect(target);
    }

    const html = rewriteHtml(
      new TextDecoder("utf-8").decode(buffer),
      upstream.url ? new URL(upstream.url) : target
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "The request timed out."
        : "Could not reach this site.";
    return new NextResponse(errorHtml(message, target), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
