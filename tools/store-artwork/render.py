#!/usr/bin/env python3
"""Export the existing native icon and store vector art."""

from pathlib import Path
import base64
import subprocess
import struct
from xml.sax.saxutils import escape
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

def bitmap(path, x, y, width, height):
    data = "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()
    return f'<image href="{data}" x="{x}" y="{y}" width="{width}" height="{height}"/>'


def native(name, top, max_height=1560):
    path = SOURCE / f"screenshots/native/{name}.png"
    width, height = struct.unpack(">II", path.read_bytes()[16:24])
    scale = min(1248 / width, max_height / height)
    w, h = width * scale, height * scale
    x = (1440 - w) / 2
    return (f'<rect x="{x-2}" y="{top-2}" width="{w+4}" height="{h+4}" rx="32" fill="#314337"/>'
            f'<svg x="{x}" y="{top}" width="{w}" height="{h}" viewBox="0 0 {width} {height}">'
            + bitmap(path, 0, 0, width, height) + '</svg>')


def card(number, lines, subtitle, body, filename, note):
    headline = ''.join(f'<text x="96" y="{240 + index * 112}" font-size="100" font-weight="700" letter-spacing="-3">{escape(line)}</text>' for index, line in enumerate(lines))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="2560" viewBox="0 0 1440 2560">
    <defs><radialGradient id="glow" cx="85%" cy="25%" r="75%"><stop stop-color="#213b29"/><stop offset="1" stop-color="#0e1510"/></radialGradient></defs>
    <path fill="url(#glow)" d="M0 0H1440V2560H0z"/>
    <g font-family="Arial, Helvetica, sans-serif" fill="#f3f7ef">
      <text x="96" y="110" font-size="28" fill="#d3f88b" letter-spacing="6">AR RULER</text>
      <text x="1344" y="110" text-anchor="end" font-size="26" fill="#95aa9b">0{number} / 04</text>
      {headline}
      <text x="96" y="440" font-size="34" fill="#b4c4b8">{escape(subtitle)}</text>
      {body}
      <text x="96" y="2396" font-size="24" fill="#b4c4b8">{escape(note)}</text>
      <path d="M96 2440H1344" stroke="#344636"/>
      <text x="96" y="2505" font-size="25" fill="#d3f88b" letter-spacing="5">PLAINOSS</text>
      <text x="1344" y="2505" text-anchor="end" font-size="25" fill="#b4c4b8">Simple tools. Nothing extra.</text>
    </g></svg>'''
    render(svg, GRAPHICS / "phone-screenshots" / filename)


# The camera image is the maintainer's real Android capture. Keep its scene and
# measured value intact; show today's native controls separately, not as a fake live session.
photo = ('<svg x="96" y="510" width="1248" height="1300" viewBox="0 65 574 598" overflow="hidden">'
         + bitmap(SOURCE / "screenshots/camera-distance.png", 0, 0, 574, 1280) + '</svg>')
card(1, ["Measure your", "space."], "Point your camera. Place points. Save the result.",
     photo + native("compact", 1860, 505), "01-camera-distance.png",
     "Android camera capture · current controls shown separately")
card(2, ["Four ways", "to measure."], "Distance, connected paths, flat areas and angles.",
     native("area", 650) + '<text x="96" y="2150" font-size="42" fill="#d3f88b">Adjust a corner. Recheck the result.</text>'
     + '<text x="96" y="2210" font-size="32" fill="#b4c4b8">Keep the area and perimeter in the same panel.</text>', "02-measurement-modes.png", "Native Android interface · example measurement")
card(3, ["Keep the", "useful numbers."], "Save measurements. Copy or share when you need them.",
     native("history", 590, 1710), "03-local-history.png", "Native Android interface · example history")
card(4, ["Your project.", "Your units."], "Meters, centimeters, millimeters, inches, feet or yards.",
     native("units", 590, 1710), "04-measurement-units.png", "Native Android interface · your choice is remembered")

# Retire only the old generated detail crop. Source captures remain available.
(GRAPHICS / "phone-screenshots/02-measurement-controls.png").unlink(missing_ok=True)
print(f"Rendered Play artwork to {GRAPHICS}")
