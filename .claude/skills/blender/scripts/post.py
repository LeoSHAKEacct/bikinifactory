# photographic finish: bloom, gentle grade, chromatic aberration, vignette, grain
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32) / 255.0
h, w, _ = a.shape
# bloom from highlights
lum = a @ np.array([.2126, .7152, .0722], np.float32)
hi = np.clip((lum - .78) / .22, 0, 1)[..., None] * a
hi_img = Image.fromarray((hi * 255).astype(np.uint8))
b1 = np.asarray(hi_img.filter(ImageFilter.GaussianBlur(w * .008))).astype(np.float32) / 255
b2 = np.asarray(hi_img.filter(ImageFilter.GaussianBlur(w * .03))).astype(np.float32) / 255
a = 1 - (1 - a) * (1 - .22 * b1) * (1 - .18 * b2 * np.array([1.0, .9, .75], np.float32))
# grade: soft S-curve, warm highlights, slightly cool shadows
a = a + .06 * (a - .5) * (1 - np.abs(a - .5) * 2)
lum = (a @ np.array([.2126, .7152, .0722], np.float32))[..., None]
a = a + (lum - .5).clip(0) * np.array([.035, .012, -.03], np.float32) + (.5 - lum).clip(0) * np.array([-.015, .0, .02], np.float32)
# lateral chromatic aberration
img = Image.fromarray((a.clip(0, 1) * 255).astype(np.uint8))
r, g, b = img.split()
def scale(ch, k):
    nw, nh = int(w * k), int(h * k); c = ch.resize((nw, nh), Image.BICUBIC)
    return c.crop(((nw - w) // 2, (nh - h) // 2, (nw - w) // 2 + w, (nh - h) // 2 + h))
img = Image.merge('RGB', (scale(r, 1.0024), scale(g, 1.0012), b))
a = np.asarray(img).astype(np.float32) / 255
# vignette
yy, xx = np.mgrid[0:h, 0:w]; d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
a = a * (1 - .22 * np.clip(d - .35, 0, 1) ** 1.6 / .42)[..., None]
# fine grain
rng = np.random.default_rng(7); a = a + rng.normal(0, .012, (h, w, 1)).astype(np.float32)
out = Image.fromarray((a.clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
out.save(dst, quality=90, optimize=True, progressive=True)
