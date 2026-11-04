"""Create Android launcher icon assets from the project's square PNG."""
from pathlib import Path
from PIL import Image
import sys

root = Path(__file__).resolve().parents[1]
source = root / "icon" / "nibblecrown.png"
res = root / "android" / "app" / "src" / "main" / "res"
if not source.is_file():
    print(f"Missing icon: {source}. Upload nibblecrown.png before publishing.", file=sys.stderr)
    sys.exit(1)

original = Image.open(source).convert("RGBA")
# Android legacy launcher icon sizes by display density.
for folder, size in {
    "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192
}.items():
    directory = res / folder
    directory.mkdir(parents=True, exist_ok=True)
    image = original.resize((size, size), Image.Resampling.LANCZOS)
    image.save(directory / "ic_launcher.png")
    image.save(directory / "ic_launcher_round.png")

# Adaptive icon: place the original round emblem within Android's safe zone.
foreground = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
logo = original.resize((276, 276), Image.Resampling.LANCZOS)
foreground.alpha_composite(logo, ((432-276)//2, (432-276)//2))
directory = res / "drawable-nodpi"
directory.mkdir(parents=True, exist_ok=True)
foreground.save(directory / "ic_launcher_foreground.png")
# Capacitor's adaptive icon XML expects these resource names.
for file in ("ic_launcher.xml", "ic_launcher_round.xml"):
    target = res / "mipmap-anydpi-v26" / file
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
''', encoding="utf-8")
background = res / "values" / "nibblecrown_icon_colors.xml"
background.parent.mkdir(parents=True, exist_ok=True)
background.write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#F5E4C8</color></resources>
''', encoding="utf-8")
print("Nibblecrown launcher icons prepared.")
