// Alarm for timers: a short beep (Web Audio) and a vibration where supported.

let audio: AudioContext | null = null
/** Browsers only allow sound after a user gesture: call this from a click. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    // No Web Audio: silent timers.
  }
}

export function beep(times = 3) {
  try {
    if (!audio) return
    const t0 = audio.currentTime
    for (let i = 0; i < times; i++) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = i === times - 1 ? 1320 : 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.25 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.25 + 0.18)
      osc.connect(gain).connect(audio.destination)
      osc.start(t0 + i * 0.25)
      osc.stop(t0 + i * 0.25 + 0.2)
    }
  } catch {
    // Ignore: sound is a nicety.
  }
  try {
    navigator.vibrate?.([200, 100, 200, 100, 300])
  } catch {
    // Not supported (iOS).
  }
}
