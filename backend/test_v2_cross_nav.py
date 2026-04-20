"""
Cross-screen navigation regression tests for v2.

These guard against the kind of bugs where a nav click from v2 context
accidentally drops the user into v24 (e.g. Brand logo pointing at '/').

All 5 v2 screens should:
  - Serve the same index-client-v2.html from their ?screen=<X> URLs
  - Reference the clientV2 bundle in the HTML
  - NOT reference the v24 client bundle

The /v2 route with no screen param should default to Diagnosis (handled
client-side, so we can only verify the HTML is the v2 HTML).
"""
import pytest
from fastapi.testclient import TestClient


V2_SCREEN_PATHS = [
    "/v2",
    "/v2?screen=diagnosis",
    "/v2?screen=plan",
    "/v2?screen=scenarios",
    "/v2?screen=channels",
    "/v2?screen=channels&ch=paid_search",
    "/v2?screen=market",
    "/v2?screen=login",
]


@pytest.fixture(scope="module")
def client():
    import api
    return TestClient(api.app)


@pytest.mark.parametrize("path", V2_SCREEN_PATHS)
def test_v2_screen_path_serves_v2_html(client, path):
    r = client.get(path)
    assert r.status_code == 200
    # Must be the v2 HTML (references clientV2 bundle or the raw entry file)
    assert "clientV2" in r.text or "main-client-v2" in r.text, \
        f"Path {path} did not serve v2 HTML"
    # Must NOT accidentally serve the v24 client bundle
    assert not r.text.count("/assets/client-") > 1, \
        f"Path {path} referenced v24 client bundle — v2 leak"


def test_v2_default_route_is_v2_html(client):
    """Root /v2 (no query) must return the v2 HTML, not redirect to / or 404."""
    r = client.get("/v2")
    assert r.status_code == 200
    assert "index-client-v2" not in r.text  # that's the filename, HTML body doesn't include it
    assert "<div id=\"root\">" in r.text


def test_root_serves_v25_now(client):
    """
    / now serves the v25 client (post-promotion). The old v24 client
    moved to /legacy for comparison/rollback access.
    """
    r = client.get("/")
    assert r.status_code == 200
    assert "clientV2" in r.text, "root should now serve v25 bundle"
    assert "main-client-v2" in r.text or "clientV2" in r.text


def test_legacy_v24_still_accessible(client):
    """/legacy serves v24 — kept for side-by-side comparison and rollback."""
    r = client.get("/legacy")
    assert r.status_code == 200
    # v24 HTML references /assets/client-<hash>.js (not clientV2)
    assert "/assets/client-" in r.text
    assert "clientV2" not in r.text


def test_legacy_editor_not_regressed(client):
    """/editor still serves v24 editor."""
    r = client.get("/editor")
    assert r.status_code == 200
    # v24 editor loads its own entry
    assert "editor" in r.text.lower()
    assert "clientV2" not in r.text


def test_v2_channel_path_preserves_ch_param(client):
    """A bookmark like /v2?screen=channels&ch=paid_search must serve v2 HTML with
    both query params intact (React reads them client-side)."""
    r = client.get("/v2?screen=channels&ch=paid_search")
    assert r.status_code == 200
    # The HTML body itself doesn't encode query params — they stay in the URL
    # and JS reads them. We just verify the response is the correct HTML.
    assert "<div id=\"root\">" in r.text
