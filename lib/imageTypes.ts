// Image formats accepted for uploads (covers and outline images). A file
// input's accept only filters the picker (its "All files" option gets around
// it) and a drop skips it entirely, so upload handlers also check each file
// with isAcceptedImage.
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

export function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type)
}
