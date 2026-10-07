import SpotlightCardBase from './SpotlightCard.jsx';

export default function SpotlightCard(props: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  return <SpotlightCardBase {...props} />;
}
