import Screen from '../../ui/Screen';

export function CenterScreen({ children, className = 'text-center' }) {
  return <Screen className={`items-center justify-center ${className}`.trim()}>{children}</Screen>;
}
