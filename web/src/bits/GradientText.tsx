import GradientTextBase from './GradientText.jsx';

export default function GradientText(props: {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  pauseOnHover?: boolean;
  yoyo?: boolean;
}) {
  return <GradientTextBase {...props} />;
}
