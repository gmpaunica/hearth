/**
 * Effective pixel scale = framebuffer pixels per CSS pixel of the surface the
 * scene is actually drawn into. PixelPass renders the diorama into a low-res
 * target (downscaled by its `pixelSize`), so point-sprite particles (fire,
 * embers, rain, sparkles) must size themselves against that reduced resolution
 * to stay chunky and aligned with the pixel-poster look — they read this value
 * into their `uDpr` uniform. PixelPass writes it every frame; the default of 1
 * is a safe fallback when no pass is mounted.
 */
export const pixelScale = { value: 1 };
