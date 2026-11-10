'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setMessage('')
    setError('')

    if (!username.trim() || !email.trim() || !password) {
      setError('ユーザー名、メールアドレス、パスワードをすべて入力してください。')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。')
      return
    }

    setIsSubmitting(true)
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/login`
    const { error: authError } = await getSupabaseClient().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() }, emailRedirectTo: redirectTo },
    })

    if (authError) {
      setError('新規登録に失敗しました。入力内容をご確認のうえ、もう一度お試しください。')
      setIsSubmitting(false)
      return
    }

    setMessage('確認メールを送信しました。メール内のリンクから認証してください。')
    setIsSubmitting(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f6] px-5 py-10 text-[#252b24] sm:px-6">
      <section className="w-full max-w-[440px]"><div className="mb-8 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-sm font-medium text-[#7c8779] transition hover:text-[#52684e]"><ArrowLeft size={16} />トップページへ戻る</Link><span className="font-serif text-[25px] font-bold tracking-[-0.04em] text-[#283126]">komorebi</span></div>
        <div className="rounded-[28px] border border-[#e3e7de] bg-white p-7 shadow-[0_12px_40px_rgba(59,75,54,0.06)] sm:p-10"><div className="mb-8 text-center"><p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[#93a28d]">JOIN KOMOREBI</p><h1 className="font-serif text-3xl font-bold tracking-[-0.04em] text-[#283126]">新規登録</h1><p className="mt-3 text-sm leading-6 text-[#858d83]">毎日の献立を、もっと軽やかに。</p></div>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-semibold text-[#4c584a]">ユーザー名<span className="relative mt-2 block"><UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a2afa0]" /><input required type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="komorebiさん" className="h-12 w-full rounded-2xl border border-[#e0e6dc] bg-[#fafbf9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4bcb2] focus:border-[#a9c0a3] focus:ring-2 focus:ring-[#dce8d8]" /></span></label>
            <label className="block text-sm font-semibold text-[#4c584a]">メールアドレス<span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a2afa0]" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" className="h-12 w-full rounded-2xl border border-[#e0e6dc] bg-[#fafbf9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4bcb2] focus:border-[#a9c0a3] focus:ring-2 focus:ring-[#dce8d8]" /></span></label>
            <label className="block text-sm font-semibold text-[#4c584a]">パスワード<span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a2afa0]" /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8文字以上で入力" className="h-12 w-full rounded-2xl border border-[#e0e6dc] bg-[#fafbf9] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4bcb2] focus:border-[#a9c0a3] focus:ring-2 focus:ring-[#dce8d8]" /></span></label>
            {error && <p role="alert" className="rounded-xl bg-[#fff3f0] px-4 py-3 text-sm text-[#a35345]">{error}</p>}{message && <p role="status" className="rounded-xl bg-[#eef5eb] px-4 py-3 text-sm leading-6 text-[#52684e]">{message}</p>}
            <button disabled={isSubmitting} type="submit" className="h-13 w-full rounded-2xl bg-[#718b6a] text-sm font-bold text-white transition hover:bg-[#5d7857] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? '登録中…' : '新規登録'}</button>
          </form><p className="mt-7 text-center text-sm text-[#858d83]">すでにアカウントをお持ちの方は <Link href="/login" className="font-bold text-[#6c8566] underline-offset-4 hover:underline">ログイン</Link></p>
        </div>
      </section>
    </main>
  )
}
