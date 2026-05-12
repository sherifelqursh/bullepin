# Public docs site

Files in this folder are published as a static site via **GitHub Pages**.

## How to publish (one-time, ~5 minutes)

1. Push this project to a public GitHub repo if you haven't already.
   ```powershell
   gh repo create elqurshdev/bullepin --public --source=. --push
   # or use the GitHub web UI
   ```
2. On GitHub: **Settings → Pages**.
3. Under **Source**, pick:
   - Branch: `main` (or whatever your default branch is named)
   - Folder: `/docs`
4. Click **Save**. GitHub builds the site and gives you a URL like
   `https://elqurshdev.github.io/bullepin/` within ~60 seconds.

Once live, the pages will be:

- `https://elqurshdev.github.io/bullepin/privacy`
- `https://elqurshdev.github.io/bullepin/terms`
- `https://elqurshdev.github.io/bullepin/help`

These match the URLs already hardcoded in [`app/(app)/profile.tsx`](../app/(app)/profile.tsx).

## Editing

The docs use Jekyll (default for GitHub Pages). Markdown front-matter
controls the URL slug:

```yaml
---
permalink: /privacy
---
```

Edit the `.md` files, commit, push — GitHub rebuilds automatically.

## Required edits before launch

Open each `.md` file and **replace `support@bullepin.app`** with a real
email you control. Apple's review will spot-check the contact email.
