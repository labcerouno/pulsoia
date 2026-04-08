'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: copied ? '#4CAF8A' : '#3D4F5A',
        color: copied ? '#fff' : '#CBCBD0',
        fontFamily: 'inherit',
      }}
    >
      {copied ? '¡Copiado!' : 'Copiar'}
    </button>
  )
}
