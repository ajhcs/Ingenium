# Project site hosting

The static presentation lives in `site/`. It needs no application backend, build dependency installation or account connection to preview locally.

From the repository root, with Node 22 or newer and Python available:

```sh
node tools/build-release-site.mjs work/site-preview
python3 -m http.server 4173 --bind 127.0.0.1 --directory work/site-preview
```

Open `http://127.0.0.1:4173`. Choose a new output directory for another staging run; the script refuses existing outputs, unsupported symlinks, missing local assets and root-relative URLs. It stages files and checks static HTML/CSS references; browser validation is separate.

## Published site

The [project site](https://ajhcs.github.io/Ingenium/) is published using GitHub Actions. The initial deployment ran from merge commit `4728a4bfacff90beac3a67a40105825cf284e361`, whose tree exactly matches the reviewed candidate. The [publication run](https://github.com/ajhcs/Ingenium/actions/runs/39075796255) completed successfully and the served HTML matched the source bytes.

The [0.1.0 preview release](https://github.com/ajhcs/Ingenium/releases/tag/v0.1.0) supplies the exact reviewed helper tarball, media, editable sources and SHA256SUMS.txt. It retains the reviewed snapshot; later publication-link documentation does not replace that archive.

## GitHub Pages setup and later updates

The repository inspection on October 17, 2026 found `has_pages: false` and no Pages configuration. That was the pre-publication inspection; the site has since been explicitly approved and published as recorded above.

The manually triggered workflow in `.github/workflows/pages.yml` stages and uploads a Pages artifact. Its `deploy` input defaults to false. Publishing requires the reviewed workflow to be available on the default branch, repository Pages settings configured to use GitHub Actions, and an explicitly triggered run with deployment enabled. No domain, sharing or security setting is changed by staging.

The deployment job uses the `github-pages` environment, depends on the completed artifact build, and receives only the Pages and identity-token write permissions needed for publication. The build job has repository read permission. After any authorized publication, inspect the workflow result and the actual hosted page, media, relative links and mobile behavior before calling it live.

See GitHub's [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [publishing-source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
