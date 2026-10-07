import type { ReactNode } from "react";
import CountUpBase from './CountUp.jsx';

export default function CountUp(props: {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}): ReactNode {
  return <CountUpBase {...props} />;
}
