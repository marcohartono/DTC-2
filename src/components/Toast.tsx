interface Props {
  show: boolean;
  message?: string;
  variant?: 'success' | 'error';
}

export function Toast({ show, message = 'Reading saved', variant = 'success' }: Props) {
  return (
    <div className={'toast ' + variant + (show ? ' show' : '')}>
      <span className={'check' + (variant === 'error' ? ' err' : '')}>
        {variant === 'error' ? '!' : '✓'}
      </span>
      {message}
    </div>
  );
}
