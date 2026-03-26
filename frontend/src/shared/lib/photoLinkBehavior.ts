/**
 * Ссылки на файлы в облачных хранилищах (страницы просмотра, а не прямой URL картинки)
 * — открываем в новой вкладке; остальное пробуем показать в модалке.
 */
export function isCloudStorageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host === 'disk.yandex.ru' || host === 'disk.yandex.com') return true
    if (host.endsWith('.disk.yandex.ru') || host.endsWith('.disk.yandex.com')) return true
    if (host.includes('drive.google.com')) return true
    if (host.includes('docs.google.com')) return true
    if (host.includes('dropbox.com')) return true
    if (host.includes('cloud.mail.ru')) return true
    if (host.includes('onedrive.live.com')) return true
    if (host.includes('sharepoint.com')) return true
    if (host.includes('mega.nz')) return true
    return false
  } catch {
    return false
  }
}

export function getPhotoUrl(extra: Record<string, unknown> | undefined | null): string {
  const v = extra?.Photo
  if (v == null) return ''
  return String(v).trim()
}

export function openPhotoByUrl(url: string, openModal: (u: string) => void): void {
  if (!url) return
  if (isCloudStorageUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    openModal(url)
  }
}
