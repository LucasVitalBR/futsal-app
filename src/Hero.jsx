import ballIcon from './assets/Icon BOLA.png'
import logo from './assets/LOGO APP.png'
import centerLogo from './assets/CENTER LOGO.png'

export default function Hero() {
  return (
    <div className="hero-banner">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-stripes" aria-hidden="true" />
      <img className="hero-logo" src={logo} alt="" aria-hidden="true" />
      <img className="hero-center-logo" src={centerLogo} alt="Futsal Kings — Mais que um jogo, uma paixão." />
      <img className="hero-ball" src={ballIcon} alt="" aria-hidden="true" />
    </div>
  )
}
