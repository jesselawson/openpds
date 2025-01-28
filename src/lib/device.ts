export async function getDeviceId(): Promise<string> {
    const storedId = localStorage.getItem('dp-device-id')
    if (storedId) return storedId
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|')
    
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(fingerprint)
    )
    
    const deviceId = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
    
    localStorage.setItem('dp-device-id', deviceId)
    return deviceId
  }