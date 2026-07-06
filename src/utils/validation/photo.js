import { ok, fail } from './result';

export const MAX_MEMBER_PHOTO_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_MEMBER_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** @param {File|null|undefined} file */
export function validateMemberPhotoFile(file) {
  if (!file) return ok();
  if (!ACCEPTED_MEMBER_PHOTO_TYPES.includes(file.type)) {
    return fail('modals.member.photoTypeError', 'photo');
  }
  if (file.size > MAX_MEMBER_PHOTO_BYTES) {
    return fail('modals.member.photoSizeError', 'photo');
  }
  return ok();
}
