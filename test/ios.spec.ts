import { vol } from 'memfs';

import { iosCommandHandler } from '../src/ios';

import { expectFileContents } from './test-utils/expectFileContents';

const FIRST_TARGET_NAME = 'SamplePlugin';
const PROJECT_FILE_PATH = '/path/to/project';
const PODSPEC_FILE = `require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "${FIRST_TARGET_NAME}"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.4" }
  s.source       = { :git => "https://path.to/repo.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  s.dependency "VisionCamera"
end
`;

jest.mock('fs');

const projectPath = `${PROJECT_FILE_PATH}/ios`;
const pluginName = 'XyzFrameProcessor';
const methodName = 'xyz';

beforeEach(() => {
  const JSONFileSystem = {
    [`${PROJECT_FILE_PATH}/ios`]: null,
    [`${PROJECT_FILE_PATH}/SamplePlugin.podspec`]: PODSPEC_FILE,
  };

  vol.fromJSON(JSONFileSystem);
});

afterEach(() => {
  vol.reset();
});

describe('ios', () => {
  test('should create Swift plugin boilerplate', async () => {
    await iosCommandHandler({
      '$0': 'vision-camera-plugin-builder',
      '_': [ 'ios' ],
      'projectPath': projectPath,
      'project-path': projectPath,
      'pluginName': pluginName,
      'plugin-name': pluginName,
      'methodName': methodName,
      'method-name': methodName,
      'lang': 'Swift',
    });

    // XyzFrameProcessorPlugin.swift
    const pluginFile = vol.readFileSync(`${PROJECT_FILE_PATH}/ios/${pluginName}/${pluginName}.swift`, { encoding: 'utf-8' });

    expectFileContents(pluginFile, [
      'import VisionCamera',
      `@objc(${pluginName}Plugin)`,
      `public class ${pluginName}Plugin: FrameProcessorPlugin`,
      new RegExp('public override init\\(proxy: VisionCameraProxyHolder, options: \\[AnyHashable: Any\\]\\! = \\[:\\]\\) {\\s+super.init\\(proxy: proxy, options: options\\)\\s+}'),
      'public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any?',
    ]);

    // XyzFrameProcessorPlugin.m
    const pluginPackageFile = vol.readFileSync(`${PROJECT_FILE_PATH}/ios/${pluginName}/${pluginName}.m`, { encoding: 'utf-8' });

    expectFileContents(pluginPackageFile, [
      '#import <VisionCamera/FrameProcessorPlugin.h>',
      '#import <VisionCamera/FrameProcessorPluginRegistry.h>',
      new RegExp(`#if __has_include\\("${FIRST_TARGET_NAME}\\/${FIRST_TARGET_NAME}-Swift.h"\\)\\s+#import "${FIRST_TARGET_NAME}\\/${FIRST_TARGET_NAME}-Swift.h"\\s+#else\\s+#import "${FIRST_TARGET_NAME}-Swift.h"\\s+#endif`),
      `VISION_EXPORT_SWIFT_FRAME_PROCESSOR(${pluginName}Plugin, ${methodName})`,
    ]);
  });
  test.each([{ lang: 'ObjC' }, { lang: 'ObjCPP' }])('should create $lang plugin boilerplate', async ({ lang }) => {
    await iosCommandHandler({
      '$0': 'vision-camera-plugin-builder',
      '_': [ 'ios' ],
      'projectPath': projectPath,
      'project-path': projectPath,
      'pluginName': pluginName,
      'plugin-name': pluginName,
      'methodName': methodName,
      'method-name': methodName,
      'lang': lang,
    });

    // XyzFrameProcessorPlugin.(m|mm)
    const pluginPackageFile = vol.readFileSync(`${PROJECT_FILE_PATH}/ios/${pluginName}/${pluginName}.${lang === 'ObjCPP' ? 'mm' : 'm'}`, { encoding: 'utf-8' });

    expectFileContents(pluginPackageFile, [
      '#import <VisionCamera/FrameProcessorPlugin.h>',
      '#import <VisionCamera/FrameProcessorPluginRegistry.h>',
      '#import <VisionCamera/Frame.h>',
      '#import <VisionCamera/VisionCameraProxy.h>',
      `@interface ${pluginName}Plugin : FrameProcessorPlugin`,
      `@implementation ${pluginName}Plugin`,
      new RegExp('- \\(instancetype _Nonnull\\)initWithProxy:\\(VisionCameraProxyHolder\\*\\)proxy\\s+withOptions:\\(NSDictionary\\* _Nullable\\)options\\s+{\\s+self = \\[super initWithProxy:proxy withOptions:options\\];\\s+return self;\\s+}'),
      new RegExp('- \\(id _Nullable\\)callback:\\(Frame\\* _Nonnull\\)frame\\s+withArguments:\\(NSDictionary\\* _Nullable\\)arguments'),
      `VISION_EXPORT_FRAME_PROCESSOR(${pluginName}Plugin, ${methodName})`,
    ]);
  });
});
