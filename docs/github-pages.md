# Project site hosting

The static presentation lives in `site/`. It needs no application backend, build dependency installation or account connection to preview locally.

From the repository root, with Node 22 or newer and Python available:

```sh
node tools/build-release-site.mjs work/site-preview
python3 -m http.server 4173 --bind 127.0.0.1 --directory work/site-preview
```

Open `http://127.0.0.1:4173`. Choose a new output directory for another staging run; the script refuses existing outputs, unsupported symlinks, missing local assets and root-relative URLs. It stages files and checks static HTML/CSS references; browser validation is separate.

## GitHub Pages preparation

The repository inspection on October 17, 2026 found `has_pages: false` and no Pages configuration. A prepared workflow is not a live website. The expected project URL after a successful publication would be `https://ajhcs.github.io/Ingenium/`; do not treat that address as a verified deployment.

The manually triggered workflow in `.github/workflows/pages.yml` stages and uploads a Pages artifact. Its `deploy` input defaults to false. Publishing requires the reviewed workflow to be available on the default branch, repository Pages settings configured to use GitHub Actions, and an explicitly triggered run with deployment enabled. No domain, sharing or security setting is changed by staging.

The deployment job uses the `github-pages` environment, depends on the completed artifact build, and receives only the Pages and identity-token write permissions needed for publication. The build job has repository read permission. After any authorized publication, inspect the workflow result and the actual hosted page, media, relative links and mobile behavior before calling it live.

See GitHub's [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [publishing-source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
