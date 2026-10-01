/**
 * The official ZorvanI ERP logo.
 *
 * The single source of truth is attached_assets/logo.png. It is imported here
 * (never redrawn or recoloured) and every place that shows the brand uses this
 * module, directly or through <BrandLogo />.
 */
import logoUrl from '@assets/logo.png';

export const BRAND_LOGO_URL: string = logoUrl;
export const BRAND_NAME = 'ZorvanI ERP';

/**
 * The artwork sits in the middle of a square canvas with a wide margin. Small
 * placements show the central part of the image so the logo stays legible;
 * this is the zoom factor (1 = the whole canvas, margin included).
 */
export const BRAND_LOGO_ZOOM = 1.75;

let logoDataUrl: Promise<string> | null = null;

/**
 * A small PNG data URL of the logo, for documents that must be self-contained
 * (printed invoices and exported PDFs). Resolves to '' if the image cannot be
 * loaded, in which case the document is produced without it.
 */
export function getBrandLogoDataUrl(size = 192): Promise<string> {
  if (!logoDataUrl) {
    logoDataUrl = new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) { resolve(''); return; }
          const side = Math.min(image.naturalWidth, image.naturalHeight) / BRAND_LOGO_ZOOM;
          context.imageSmoothingQuality = 'high';
          context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve('');
        }
      };
      image.onerror = () => resolve('');
      image.src = logoUrl;
    });
  }
  return logoDataUrl;
}
