module.exports = {
  dependencies: {
    "@voximplant/react-native-foreground-service": {
      root: __dirname + "/local-modules",
      platforms: {
        android: {
          sourceDir: "android",
          packageImportPath:
            "import com.voximplant.foregroundservice.VIForegroundServicePackage;",
          packageInstance: "new VIForegroundServicePackage()",
        },
      },
    },
    // local-audiomode removed: same android module as above; AudioModePackage added in MainApplication.kt
  },
};
