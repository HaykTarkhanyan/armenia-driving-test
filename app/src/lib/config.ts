// Public addresses of the Neon services (backend/README.md). These are not secrets: the API checks a signed token on
// every data request.
// VITE_AUTH_URL and VITE_API_URL exist only to point a local build at a temporary test branch (delete_check.py).
export const AUTH_URL: string = import.meta.env.VITE_AUTH_URL ?? 'https://ep-rough-truth-bhrc5p77.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth'
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'https://br-green-bird-bh8yxv3r-api.compute.c-10.eu-central-1.aws.neon.tech'
