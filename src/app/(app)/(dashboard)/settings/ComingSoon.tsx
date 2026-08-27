type Props = { label: string };

export default function ComingSoon({ label }: Props) {
  return (
    <div className="min-h-[240px] flex items-center justify-center">
      <p className="font-montserrat text-primary-blue/60 text-[14px]">
        {label} — coming soon.
      </p>
    </div>
  );
}
