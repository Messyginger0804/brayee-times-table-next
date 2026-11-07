"""Cuts Braylee out of her source photo, fully offline (no web service, no paid API).

Usage (venv with: rembg[cpu] pillow numpy opencv-python-headless pymatting):
  U2NET_HOME=<dir for model files> python -I scripts/braylee-cutout.py
Reads  private/avatars/braylee-source-2026-11-06.png  (gitignored, tuned for that exact photo)
Writes private/avatars/braylee-cutout.png             (1500x1500, transparent, no metadata; gitignored)
Then run: node scripts/build-braylee-face.mjs && node scripts/build-icons.mjs && node scripts/build-og-image.mjs
Model: isnet-general-use via rembg with alpha matting; then keep the main blob, soften the edge, decontaminate colours.
"""
import os
import cv2
import numpy as np
from PIL import Image
from pymatting import estimate_foreground_ml
from rembg import new_session, remove

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
AV = os.path.join(ROOT, 'private', 'avatars')
src = Image.open(os.path.join(AV, 'braylee-source-2026-11-06.png')).convert('RGB')

cut = remove(src, session=new_session('isnet-general-use'), alpha_matting=True,
             alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
a = np.asarray(cut)[..., 3].astype(np.float32) / 255
rgb = np.asarray(src) / 255.0
H, W = a.shape
yy, xx = np.mgrid[0:H, 0:W]
ellipse = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))

# main blob only
n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), connectivity=8)
a = a * cv2.dilate((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8), np.ones((9, 9), np.uint8))

# pink box peeking over the crown: remove only solid pink blobs (not speckles of hair)
pink = ((yy < 300) & (rgb[..., 2] > 0.8 * rgb[..., 1])).astype(np.uint8)
blob = cv2.dilate(cv2.morphologyEx(pink, cv2.MORPH_OPEN, ellipse(19)), ellipse(15)) > 0
a = a * (~blob)
# fade out the clutter at the far left edge
a = a * np.where((yy > 650) & (yy < 1500), np.clip((xx - 60) / 110.0, 0, 1), 1.0)
# re-close the crown where the pink box was
closed = cv2.morphologyEx(a, cv2.MORPH_CLOSE, ellipse(91))
a = np.where((yy < 330) & (xx > 500) & (xx < 1000), np.maximum(a, closed), a)

# trim halo, soften, rescale
a = cv2.GaussianBlur(cv2.erode(a, np.ones((3, 3), np.uint8)), (0, 0), 1.6)
a = np.clip((a - 0.08) / 0.84, 0, 1)
fg = estimate_foreground_ml(rgb, a)
out = Image.fromarray((np.dstack([np.clip(fg, 0, 1), a]) * 255).astype(np.uint8), 'RGBA')
out.crop((0, 70, 1500, 1570)).save(os.path.join(AV, 'braylee-cutout.png'), optimize=True)
print('wrote private/avatars/braylee-cutout.png')
