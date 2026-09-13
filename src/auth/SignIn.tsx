type SignInProps = {
  onSignIn: () => void
}

export function SignIn({ onSignIn }: SignInProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <button type="button" onClick={onSignIn}>
        התחבר עם Google
      </button>
    </div>
  )
}
