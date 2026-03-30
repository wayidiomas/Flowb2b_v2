import localFont from 'next/font/local'

export const satoshi = localFont({
  src: [
    {
      path: '../fonts/Satoshi-Light.woff',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/Satoshi-Regular.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Satoshi-Medium.woff',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/Satoshi-Bold.woff',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/Satoshi-Black.woff',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})
