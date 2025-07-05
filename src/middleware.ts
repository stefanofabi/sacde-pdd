import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es'],
 
  // Used when no locale matches
  defaultLocale: 'es'
});
 
export const config = {
  // Match all pathnames except for
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
