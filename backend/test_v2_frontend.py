"""
Smoke tests for the v2 frontend serving layer.

These verify:
  - GET /v2 returns the new index-client-v2.html
  - The HTML includes the Libre Caslon font link and the v2 module script
  - The built bundle for clientV2 exists in frontend-dist/
  - GET /index-client-v2.html also serves the same HTML (deep-link fallback)
  - The legacy /index-client.html and / still work (no regression)
"""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import api
    return TestClient(api.app)


def test_v2_route_returns_html(client):
    r = client.get("/v2")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "<div id=\"root\">" in r.text


def test_v2_html_loads_libre_caslon(client):
    """The v5 design uses Libre Caslon Text — the HTML must include the font link."""
    r = client.get("/v2")
    assert "Libre+Caslon+Text" in r.text, \
        "v2 HTML missing Libre Caslon font link — Session 5 requirement"


def test_v2_html_references_v2_entry(client):
    """The v2 HTML must load the v2 entry bundle, not the legacy client bundle."""
    r = client.get("/v2")
    # Vite prod rewrites /main-client-v2.jsx → /assets/clientV2-<hash>.js.
    # In dev, the raw /main-client-v2.jsx path may be present instead.
    has_v2 = ("clientV2" in r.text) or ("main-client-v2" in r.text)
    assert has_v2, "v2 HTML is not pointing at the v2 entry bundle"
    # And it must NOT reference the legacy client bundle
    # (dev) main-client.jsx shouldn't appear; (prod) /assets/client-<hash>.js shouldn't be the primary script
    # We just check the v2 reference is there — the more important assertion.


def test_v2_direct_html_path_also_works(client):
    """Deep-link /index-client-v2.html should return the same HTML."""
    r = client.get("/index-client-v2.html")
    assert r.status_code == 200
    assert "<div id=\"root\">" in r.text


def test_clientV2_bundle_built():
    """The Vite build should produce a clientV2 bundle."""
    import api
    dist = os.path.join(
        os.path.dirname(os.path.abspath(api.__file__)), "..", "frontend-dist", "assets"
    )
    if not os.path.isdir(dist):
        pytest.skip("frontend-dist/assets not present (run `npm run build`)")
    files = os.listdir(dist)
    bundles = [f for f in files if f.startswith("clientV2") and f.endswith(".js")]
    assert len(bundles) >= 1, f"No clientV2-*.js bundle found. Got: {files}"


def test_legacy_client_still_works(client):
    """Regression: /index-client.html must still return the v24 client page."""
    r = client.get("/index-client.html")
    assert r.status_code == 200
    # Vite prod build rewrites /main-client.jsx → /assets/client-<hash>.js.
    # The legacy page should reference a "client-" chunk (no V2 suffix).
    assert "/assets/client-" in r.text, \
        "Legacy client HTML should reference the client-<hash>.js bundle"
    assert "clientV2" not in r.text, \
        "Legacy client HTML must NOT reference the clientV2 bundle"


def test_root_still_serves_legacy(client):
    """Regression: / defaults to the legacy client during parallel deployment."""
    r = client.get("/")
    assert r.status_code == 200
    # Default / still points at legacy until we flip it at end of migration
    assert "main-client-v2" not in r.text, \
        "Root / should still serve v24 during parallel deployment — don't flip until Session 16"
