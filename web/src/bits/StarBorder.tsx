import StarBorderBase from './StarBorder.jsx';

export default function StarBorder(props: {
  as?: React.ElementType;
  className?: string;
  color?: string;
  speed?: string;
  thickness?: number;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  return <StarBorderBase {...props} />;
}
