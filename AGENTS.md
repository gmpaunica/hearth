# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# CANONICAL PHONE CLIENT CHECKOUT

Do not publish a phone-client EAS Update from this checkout. Its client scene is
older than the installed preview and does not contain the expanded garden and
animated `KoiPond` implementation.

The canonical phone-client checkout is `C:\Windows\System32\hearth`. For any
mobile UI, scene, asset, or preview-publishing task, work from that directory,
read its `AGENTS.md`, validate there, and publish from there. This checkout may
still be used for its separate backend-hardening work. Do not combine or copy
the two dirty trees without an explicit reconciliation task.

# CANONICAL WEBSITE CHECKOUT

The standalone marketing/waitlist website is `C:\Users\Gmpau\hearth-site`.
For any website design, waitlist, domain, hosting, email-list, analytics, or
publication task, work from that directory, read its `AGENTS.md`, and read
`PUBLICATION_ROADMAP.md` in full before planning or changing publication state.
Do not implement or deploy the website from this backend-hardening checkout.
