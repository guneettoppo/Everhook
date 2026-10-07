import DecryptedTextBase from './DecryptedText.jsx';

export default function DecryptedText(props: {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover' | 'click' | 'inViewHover' | 'load';
  clickMode?: 'once' | 'toggle';
  [key: string]: unknown;
}) {
  return <DecryptedTextBase {...props} />;
}
