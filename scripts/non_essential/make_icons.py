"""Draw the app icons (a white steering wheel on Armenian-flag blue) into app/public/icons/.

    uv run python scripts/non_essential/make_icons.py   # ~1 s

Writes icon-192.png, icon-512.png, icon-maskable-512.png and apple-touch-icon.png. On the maskable icon Android may
crop everything outside the middle 80%, so the wheel is drawn smaller there.
"""

import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import ROOT, setup_logging  # noqa: E402

log = setup_logging("make_icons")

BLUE = (0, 51, 160)
WHITE = (255, 255, 255)
ORANGE = (242, 168, 0)
OVERSAMPLE = 4  # drawn large and scaled down, for smooth edges


def wheel(size: int, wheel_share: float, rounded: bool) -> Image.Image:
    s = size * OVERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s // 5, fill=BLUE)
    else:
        d.rectangle((0, 0, s, s), fill=BLUE)
    c, r = s / 2, s * wheel_share / 2
    ring = r * 0.17
    d.ellipse((c - r, c - r, c + r, c + r), outline=WHITE, width=round(ring))
    spoke = round(r * 0.17)
    d.line((c - r + ring / 2, c, c + r - ring / 2, c), fill=WHITE, width=spoke)
    d.line((c, c, c, c + r - ring / 2), fill=WHITE, width=spoke)
    hub = r * 0.30
    d.ellipse((c - hub, c - hub, c + hub, c + hub), fill=ORANGE, outline=WHITE, width=round(r * 0.07))
    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    t0 = time.time()
    out = ROOT / "app" / "public" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    wheel(192, 0.72, True).save(out / "icon-192.png", optimize=True)
    wheel(512, 0.72, True).save(out / "icon-512.png", optimize=True)
    wheel(512, 0.58, False).save(out / "icon-maskable-512.png", optimize=True)
    wheel(180, 0.66, False).convert("RGB").save(out / "apple-touch-icon.png", optimize=True)  # iOS adds its own corners
    log.info(f"wrote 4 icons to {out} in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
