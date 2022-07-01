# Vision Camera Plugin Builder

<div style="display: flex; flex-direction: column; align-items: center">
  <div style="padding: 30px">
    <img src="./static/vision-camera-plugin-builder-logo.svg" alt="Vision Camera Plugin Builder logo" width="50%" />
  </div>
  <blockquote>Create Vision Camera plugin native boilerplate in a few seconds</blockquote>
</div>

## 🚀 Usage

> :warning: To generate ios boilerplate, you must first install [xcodeproj](https://github.com/CocoaPods/Xcodeproj) gem

```sh
npx vision-camera-plugin-builder ios
```

```sh
npx vision-camera-plugin-builder android
```

## Options

| Flag | Input | Description |
| ---- | ----- | ----------- |
| --projectPath (iOS only) | [string] | Path to .xcodeproj file |
| --manifestPath (Android only) | [string] | Path to project's Android Manifest file |
| --pluginName | [string] | Name of the plugin |
| --methodName | [string] | Name of plugin's exported method |
| --lang | [choices] | "Kotlin" or "Java" for Android & "Swift" or "ObjC" or "ObjCPP" for iOS |

## License

MIT
