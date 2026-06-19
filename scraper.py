import sys
import json
import subprocess
import re

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        return

    url = sys.argv[1]
    html = ""
    method_used = "native"

    try:
        # Dynamic installation attempt if startup pre-install didn't finish
        try:
            from scrapling import fetch
            method_used = "scrapling"
        except ImportError:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "scrapling", "--quiet"], timeout=30)
                from scrapling import fetch
                method_used = "scrapling"
            except Exception:
                method_used = "fallback_native"
        
        if method_used == "scrapling":
            # Scrape with scrapling
            page = fetch(url)
            # Fetch returns an Adaptor object
            if hasattr(page, 'text') and page.text:
                html = page.text
            elif hasattr(page, 'content') and page.content:
                html = page.content if isinstance(page.content, str) else page.content.decode('utf-8', errors='ignore')
            else:
                html = str(page)
        else:
            raise ImportError("Scrapling not available, utilizing fallback scraper.")

    except Exception as scrap_err:
        # Fallback to urllib standard web requests
        try:
            import urllib.request
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')
            method_used = "urllib_fallback"
        except Exception as fallback_err:
            print(json.dumps({"error": f"Scrapling error: {str(scrap_err)}. Fallback error: {str(fallback_err)}"}))
            return

    # Clean HTML contents
    try:
        cleaned = re.sub(r'<script[^>]*>([\s\S]*?)<\/script>', '', html, flags=re.IGNORECASE)
        cleaned = re.sub(r'<style[^>]*>([\s\S]*?)<\/style>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<svg[^>]*>([\s\S]*?)<\/svg>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<noscript[^>]*>([\s\S]*?)<\/noscript>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<iframe[^>]*>([\s\S]*?)<\/iframe>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<nav[^>]*>([\s\S]*?)<\/nav>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<footer[^>]*>([\s\S]*?)<\/footer>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<header[^>]*>([\s\S]*?)<\/header>', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'<!--[\s\S]*?-->', '', cleaned)
        cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        text_content = cleaned[:45000]
        
        print(json.dumps({
            "text": text_content,
            "method": method_used,
            "length": len(text_content)
        }))
    except Exception as parse_err:
        print(json.dumps({"error": f"Parsing failed: {str(parse_err)}"}))

if __name__ == "__main__":
    main()
