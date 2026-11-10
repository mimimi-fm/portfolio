'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LockKeyhole, Mail } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

function getLoginErrorMessage(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません。'
  if (message.toLowerCase().includes('email not confirmed')) return 'メールアドレスの認証が完了していません。確認メールをご確認ください。'
  return 'ログインに失敗しました。時間をおいてもう一度お試しください。'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError('')

    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setIsSubmitting(true)
    const { error: authError } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(getLoginErrorMessage(authError.message))
      setIsSubmitting(false)
      return
    }

    router.push('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f6] px-5 py-10 text-[#252b24] sm:px-6">
      <section className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[#7c8779] transition hover:text-[#52684e]"><ArrowLeft size={16} />トップページへ戻る</Link>
          <span className="font-serif text-[25px] font-bold tracking-[-0.04em] text-[#283126]">komorebi</span>
        </div>
        <div className="rounded-[28px] border border-[#e3e7de] bg-white p-7 shadow-[0_12px_40px_rgba(59,75,54,0.06)] sm:p-10">
          <div className="mb-8 text-center"><p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[#93a28d]">WELCOME BACK</p><h1 className="font-serif text-3xl font-bold tracking-[-0.04em] text-[#283126]">ログイン</h1><p className="mt-3 text-sm leading-6 text-[#858d83]">komorebiをもっと便利に使いましょう。</p></div>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-semibold text-[#4c584a]">メールアドレス<span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a2afa0]" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" className="h-12 w-full rounded-2xl border border-[#e0e6dc] bg-[#fafbf9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4bcb2] focus:border-[#a9c0a3] focus:ring-2 focus:ring-[#dce8d8]" /></span></label>
            <label className="block text-sm font-semibold text-[#4c584a]">パスワード<span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a2afa0]" /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="パスワードを入力" className="h-12 w-full rounded-2xl border border-[#e0e6dc] bg-[#fafbf9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4bcb2] focus:border-[#a9c0a3] focus:ring-2 focus:ring-[#dce8d8]" /></span></label>
            {error && <p role="alert" className="rounded-xl bg-[#fff3f0] px-4 py-3 text-sm text-[#a35345]">{error}</p>}
            <button disabled={isSubmitting} type="submit" className="h-13 w-full rounded-2xl bg-[#718b6a] text-sm font-bold text-white transition hover:bg-[#5d7857] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'ログイン中…' : 'ログイン'}</button>
          </form>
          <p className="mt-7 text-center text-sm text-[#858d83]">アカウントをお持ちでない方は <Link href="/signup" className="font-bold text-[#6c8566] underline-offset-4 hover:underline">新規登録</Link></p>
        </div>
      </section>
    </main>
  )
}
