#!/usr/bin/env python3
"""Export the existing native icon and store vector art."""

from pathlib import Path
import base64
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
GRAPHICS = ROOT / "apps/ar-ruler-mobile/androidApp/src/main/play/listings/en-US/graphics"
ANDROID = "{http://schemas.android.com/apk/res/android}"


def render(svg, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["rsvg-convert", "--format=png", "--output", str(destination)],
                   input=svg.encode(), check=True)


icon = ET.parse(ROOT / "apps/ar-ruler-mobile/androidApp/src/main/res/drawable/ic_ruler.xml").getroot()
paths = []
for path in icon.findall("path"):
    attributes = {"d": path.get(ANDROID + "pathData"), "fill": path.get(ANDROID + "fillColor", "none")}
    if path.get(ANDROID + "strokeColor"):
        attributes.update(stroke=path.get(ANDROID + "strokeColor"), **{"stroke-width": path.get(ANDROID + "strokeWidth")})
    paths.append(ET.tostring(ET.Element("path", attributes), encoding="unicode"))
render('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 108 108">' + ''.join(paths) + '</svg>', GRAPHICS / "icon/icon.png")
render((SOURCE / "feature-graphic.svg").read_text(), GRAPHICS / "feature-graphic/feature-graphic.png")

capture = "data:image/png;base64," + base64.b64encode((SOURCE / "screenshots/camera-distance.png").read_bytes()).decode()
render(f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><path fill="#0e1510" d="M0 0H720V1280H0z"/><image href="{capture}" x="73" y="0" width="574" height="1280"/></svg>', GRAPHICS / "phone-screenshots/01-camera-distance.png")
render(f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
<defs><clipPath id="detail"><path d="M0 190H720V1180H0z"/></clipPath></defs>
<path fill="#0e1510" d="M0 0H720V1280H0z"/>
<text x="360" y="84" text-anchor="middle" fill="#d3f88b" font-family="Arial, Helvetica, sans-serif" font-size="33" font-weight="700">Edit points. Save results.</text>
<text x="360" y="131" text-anchor="middle" fill="#b4c4b8" font-family="Arial, Helvetica, sans-serif" font-size="20">Measurements stay on your device.</text>
<g clip-path="url(#detail)"><image href="{capture}" x="0" y="-425" width="720" height="1605.575"/></g>
</svg>''', GRAPHICS / "phone-screenshots/02-measurement-controls.png")

print(f"Rendered Play artwork to {GRAPHICS}")
