# Vision Camera Plugin Builder

<div align="center">
  <div style="padding: 30px">
    <img src="./static/vision-camera-plugin-builder-logo.svg" alt="Vision Camera Plugin Builder logo" width="30%" />
  </div>
  A CLI to easily create <a href="https://github.com/mrousavy/react-native-vision-camera">VisionCamera</a> Frame Processor Plugins in a few seconds!
</div>

## 🚀 Usage

```sh
npx vision-camera-plugin-builder@latest ios
```

```sh
npx vision-camera-plugin-builder@latest android
```

After generating native files, cli will output additional post-setup info

### Supported versions

| vision-camera-plugin-builder | react-native-vision-camera
| --- | --- |
| >= 0.7.0 | 3.8.0+ |
| >= 0.5.0 | 3.5.0+ |
| >= 0.3.0 | 3.0.0+ |
| < 0.3.0 | 2.0.0+ |

### Library use case

For `vision-camera-<pluginName>`, it generates:

- Android - inside Android source set:
  ```
  ├── android/src/main/<packageName>
  │   ├── <pluginName>
  │   ├──   ├── <pluginName>Plugin.(java|kt)
  │   ├── <pluginName>PluginPackage.(java|kt)
  ```
- iOS - inside iOS library's source code folder:
  ```
  ├── ios
  │   ├── <pluginName>
  │   ├──   ├── <pluginName>Plugin.(m|mm)
  │   ├──   ├── <pluginName>Plugin.Swift (if Swift selected)
  ```

In case of library use case the CLI will output how to proceed with additional steps for library's `.podspec` and `build.gradle` files

### Application use case

For local usage inside application, it generates:

- Android - inside Android source set:
  ```
  ├── android/src/main/<packageName>
  │   ├── <pluginName>
  │   ├──   ├── <pluginName>Plugin.(java|kt)
  │   ├──   ├── <pluginName>PluginPackage.(java|kt)
  ```
- iOS - inside iOS library's source code folder:
  ```
  ├── ios
  │   ├── <pluginName>
  │   ├──   ├── <pluginName>Plugin.(m|mm)
  │   ├──   ├── <pluginName>Plugin.Swift (if Swift selected)
  ```

In case of application use case the CLI will output how to proceed with additional steps for Android application linking of the plugin's package

## ⚙️ Options

| Flag | Input | Description |
| ---- | ----- | ----------- |
| --projectPath (iOS only) | [string] | Path to .xcodeproj file |
| --manifestPath (Android only) | [string] | Path to project's Android Manifest file |
| --pluginName | [string] | Name of the plugin |
| --methodName | [string] | Name of plugin's exported method |
| --lang | [choices] | "Kotlin" or "Java" for Android & "Swift" or "ObjC" or "ObjCPP" for iOS |

## License

MIT
