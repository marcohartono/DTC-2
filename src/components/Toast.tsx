interface Props {
  show: boolean;
  message?: string;
}

export function Toast({ show, message = 'Reading saved' }: Props) {
  return (
    <div className={'toast ' + (show ? 'show' : '')}>
      <span className="check">✓</span>
      {message}
    </div>
  );
}
