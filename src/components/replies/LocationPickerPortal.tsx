'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { LocationModal, type LocationValue } from '@/app/(app)/(dashboard)/new-story/pickers';

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

type Props = {
  initial: LocationValue | null;
  onClose: () => void;
  onSubmit: (v: LocationValue) => void;
};

// Thin wrapper so the public reply flow can mount LocationModal (which uses
// `useMapsLibrary`) without needing APIProvider at the layout root. Loaded
// via next/dynamic from StepRecord/StepCompose only when the pill is tapped.
export default function LocationPickerPortal(props: Props) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <LocationModal {...props} />
    </APIProvider>
  );
}
