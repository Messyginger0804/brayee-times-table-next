# Private avatars

Copy `avatars.example.json` to `private/avatars.json` (gitignored) and put the
image files under `private/avatars/`. Keys are exact user names; values map a
size (160 or 512) to a path relative to `private/`. Never place these under
`public/`. Not deployed to Vercel, so `/api/avatar` returns 404 there and the UI
falls back to the emoji astronaut.

## Host (public landing-page astronaut)

The optional `"host"` key names which entry is shown to everyone (no login) by
`GET /api/avatar/host?size=160|512`, e.g. `"host": "ExampleUserName"`. It may
also be a size map or a path relative to `private/`. Files are read only from
`private/`, never `public/`. If `host` is missing or the file is absent
(Vercel, fresh checkout) the endpoint returns 404 and the UI shows the emoji
astronaut. In Docker, mount `private/` read-only (see docker-compose.yml)
rather than baking it into the image.
