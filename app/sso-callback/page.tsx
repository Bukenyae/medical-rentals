'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SsoCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback />
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-semibold text-gray-900">Finishing sign-in...</h1>
          <p className="mt-2 text-sm text-gray-600">
            We are reconnecting your Belle Rouge account.
          </p>
        </div>
      </div>
    </>
  )
}
