import bronzeCard from '../assets/Card Bronze.png'
import goldCard from '../assets/Card Gold.png'
import habilityCard from '../assets/Card Hability.png'
import iconCard from '../assets/Card Icon.png'
import especialCard from '../assets/Card Especial.png'
import legendCard from '../assets/Card Legend.png'

const TIERS = [
  {
    max: 50,
    name: 'Bronze',
    image: bronzeCard,
    text: '#3a2b16',
    watermark: 'rgba(58, 43, 22, 0.35)',
    halo: 'rgba(255, 255, 255, 0.7)',
  },
  {
    max: 60,
    name: 'Gold',
    image: goldCard,
    text: '#62521c',
    watermark: 'rgba(98, 82, 28, 0.3)',
    halo: 'rgba(255, 255, 255, 0.7)',
  },
  {
    max: 70,
    name: 'Hability',
    image: habilityCard,
    text: '#f5e7a7',
    watermark: 'rgba(245, 231, 167, 0.35)',
    halo: 'rgba(255, 255, 255, 0.7)',
  },
  {
    max: 80,
    name: 'Icon',
    image: iconCard,
    text: '#4e4323',
    watermark: 'rgba(78, 67, 35, 0.3)',
    halo: 'rgba(255, 255, 255, 0.7)',
  },
  {
    max: 99,
    name: 'Especial',
    image: especialCard,
    text: '#fff2fa',
    watermark: 'rgba(255, 242, 250, 0.35)',
    halo: 'rgba(63, 4, 38, 0.7)',
  },
  {
    max: 120,
    name: 'Legend',
    image: legendCard,
    text: '#ffffff',
    watermark: 'rgba(255, 255, 255, 0.35)',
    halo: 'rgba(0, 0, 0, 0.65)',
  },
]

export function getRarity(overall) {
  return TIERS.find((tier) => overall <= tier.max)
}

// Índice do tier na lista acima (0 = Bronze, 5 = Legend). Usado pra saber
// quando o jogador "pulou" de um tier pro outro depois de distribuir pontos.
export function getTierIndex(overall) {
  return TIERS.findIndex((tier) => overall <= tier.max)
}

export function getTierByIndex(index) {
  return TIERS[index]
}

export { TIERS }
