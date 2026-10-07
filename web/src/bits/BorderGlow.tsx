import BorderGlowBase from './BorderGlow.jsx';

export default function BorderGlow(props: {
  children: React.ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}) {
  return <BorderGlowBase {...props} />;
}
