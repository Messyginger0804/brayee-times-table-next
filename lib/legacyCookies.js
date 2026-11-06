// The "trusted device" cookie feature was removed. Browsers that still hold its cookie get it expired on login/logout.
const LEGACY_DEVICE_COOKIE = 'device_trust';
export const expireLegacyDeviceCookie = (res) => {
  res.cookies.set(LEGACY_DEVICE_COOKIE, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
  return res;
};
