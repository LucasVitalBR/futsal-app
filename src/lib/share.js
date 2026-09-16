import { toPng } from 'html-to-image'

// Transforma um elemento da tela numa imagem PNG e manda pro menu de
// compartilhamento do aparelho (o WhatsApp aparece entre as opções, junto
// com os outros apps instalados). Em navegador que não sabe compartilhar
// arquivo — a maioria dos desktops — baixa a imagem, pra anexar à mão numa
// conversa do WhatsApp Web.
export async function shareElementAsImage(element, { fileName = 'futsal.png', title = '', text = '' } = {}) {
  if (!element) return

  const dataUrl = await toPng(element, { pixelRatio: 2, cacheBust: true })

  if (navigator.canShare) {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], fileName, { type: 'image/png' })

    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text })
      return
    }
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}
