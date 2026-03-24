export default defineBackground(() => {
  console.log("[Mudar] background script cargado ✅")

  // Listener para futuros mensajes desde content script o popup
  browser.runtime.onMessage.addListener(
    (message: { type: string }, _sender, _sendResponse) => {
      console.log("[Mudar] mensaje recibido:", message.type)
    }
  )
})
