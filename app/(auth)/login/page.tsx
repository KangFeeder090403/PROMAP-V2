import { AuthHero } from '@/components/auth/AuthHero'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { googleEnabled } from '@/lib/auth'

// Server component — flag provider dibaca di server supaya tombol SSO tidak
// pernah dirender saat GOOGLE_CLIENT_ID/SECRET kosong.
export default function LoginPage() {
  return (
    <div className="grid w-full grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-10">
      {/* Panel auth — tampil lebih dulu di mobile */}
      <div className="order-1 w-full lg:order-2 lg:justify-self-center">
        <LoginPanel googleEnabled={googleEnabled} />
      </div>

      {/* Hero */}
      <div className="order-2 lg:order-1">
        <AuthHero />
      </div>
    </div>
  )
}
