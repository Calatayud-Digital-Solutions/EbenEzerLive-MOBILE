# Checklist: new revision to App Store

Use this when sending a new build to Apple for review.

For **internal tester builds** (TestFlight internal / Play internal track, no full store review), see **[docs/TEST_BUILDS.md](docs/TEST_BUILDS.md)**.

## 1. Build iOS on EAS

```bash
npx eas build --platform ios --profile production
```

Wait for the build to finish in [expo.dev](https://expo.dev). Current version: **1.0.4**, build **17**.

## 2. Submit build to App Store Connect

When the build is ready:

```bash
npx eas submit --platform ios --profile production --latest
```

Or pick a specific build:

```bash
npx eas submit --platform ios --profile production
```

## 3. Add notes for reviewers (important)

In **App Store Connect**:

1. Open your app → **App Review Information**.
2. In **Notes**, paste the full content of **APP_STORE_REVIEW_NOTES.md** (from this repo).
3. That text explains the app, how to test the language buttons, and that they are only active during the live stream.

This avoids rejections for “inactive buttons” when reviewers test without the stream.

## 4. Submit for review

In App Store Connect, submit the new version (1.0.4 build 17) for review.

---

**Next time you bump version:** update `version` in `package.json` and `app.json`, and `buildNumber` in `app.json` (iOS).
