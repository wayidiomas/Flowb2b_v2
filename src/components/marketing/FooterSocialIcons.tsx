'use client'

import { InstagramLogo, LinkedinLogo } from '@phosphor-icons/react'

export function FooterSocialIcons() {
  return (
    <div className="mt-6 flex gap-4">
      <a href="#" aria-label="Instagram">
        <InstagramLogo className="w-5 h-5 text-white/50 hover:text-white transition-colors duration-200 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] cursor-pointer" />
      </a>
      <a href="#" aria-label="LinkedIn">
        <LinkedinLogo className="w-5 h-5 text-white/50 hover:text-white transition-colors duration-200 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] cursor-pointer" />
      </a>
    </div>
  )
}
