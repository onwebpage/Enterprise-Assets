import { cn } from '@/lib/utils';
import { BRAND_LOGO_URL, BRAND_LOGO_ZOOM, BRAND_NAME } from '@/lib/brand-logo';

interface Props {
  /** Size and corner radius, e.g. "w-8 h-8 rounded-lg". */
  className?: string;
  /** Show the whole canvas including its margin (large placements). Default: zoom to the artwork. */
  full?: boolean;
}

/** The official ZorvanI ERP logo (attached_assets/logo.png), used wherever the brand mark appears. */
export default function BrandLogo({ className, full = false }: Props) {
  return (
    <span className={cn('inline-block shrink-0 overflow-hidden bg-[#001532] align-middle', className)}>
      <img
        src={BRAND_LOGO_URL}
        alt={BRAND_NAME}
        draggable={false}
        className="block h-full w-full object-cover"
        style={full ? undefined : { transform: `scale(${BRAND_LOGO_ZOOM})` }}
      />
    </span>
  );
}
