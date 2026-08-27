type HeroBannerProps = {
  src: string;
  alt?: string;
};

export default function HeroBanner({ src, alt = "" }: HeroBannerProps) {
  return (
    <div className="w-full h-[100px] md:h-[140px] lg:h-[160px] rounded-[16px] md:rounded-[20px] overflow-hidden bg-[#EDEDED]">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
