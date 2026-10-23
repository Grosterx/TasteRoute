import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽'
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const cuisineStyles: Record<string, string> = {
  итальянская: 'from-[#7c3a1d] via-[#c77a10] to-[#f7b84b]',
  русская: 'from-[#173b3f] via-[#2e6f68] to-[#b7d8c4]',
  восточная: 'from-[#4a1c14] via-[#9b3b24] to-[#f0a35e]',
  морепродукты: 'from-[#0d2d46] via-[#1c6382] to-[#8bd0d8]',
  гриль: 'from-[#2b1710] via-[#71341f] to-[#e88d4b]',
  здоровое: 'from-[#173b25] via-[#357a4a] to-[#b8df9f]',
  азиатская: 'from-[#35122f] via-[#7b2f5e] to-[#f0a0a8]',
  кавказская: 'from-[#3a1a13] via-[#8c3a22] to-[#e3b36a]',
  европейская: 'from-[#25233d] via-[#4e4a82] to-[#b8b4e8]',
  пицца: 'from-[#4a1616] via-[#a83a2d] to-[#f2b35f]',
  узбекская: 'from-[#3b2b12] via-[#8a6a25] to-[#e8cf84]',
  барбекю: 'from-[#2b160f] via-[#6c2d18] to-[#e17b46]',
  вегетарианская: 'from-[#173b25] via-[#3f7d3b] to-[#c9e38c]',
  грузинская: 'from-[#32181a] via-[#7a2b34] to-[#e3a06b]',
  рыба: 'from-[#0e2a3d] via-[#25627a] to-[#9ed8df]',
  стейк: 'from-[#2a1514] via-[#6b2822] to-[#d88b62]',
  веган: 'from-[#14361f] via-[#3f7a3f] to-[#cbe89a]',
  тайская: 'from-[#3b1e12] via-[#8b3e20] to-[#f2c15e]',
}

export function cuisineGradient(cuisine: string) {
  return cuisineStyles[cuisine] ?? 'from-[#2b241d] via-[#5a4733] to-[#d6b37a]'
}

export function tagLabel(tag: string) {
  const labels: Record<string, string> = {
    хит: 'хит',
    веган: 'веган',
    рыба: 'рыба',
    мясо: 'мясо',
    острое: 'острое',
  }
  return labels[tag] ?? tag
}
