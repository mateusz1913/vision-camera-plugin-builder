import fs from 'fs';
import path from 'path';

import glob from 'glob';
import kleur from 'kleur';
import type { Ora } from 'ora';
import type { XcodeProject } from 'xcode';
import xcode from 'xcode';

const IOS_GLOB_OPTIONS = {
  absolute: true,
  ignore: [ '**/@(Carthage|Pods|vendor|node_modules)/**' ],
  nocase: true,
  nodir: false,
};
const PODSPEC_NAME_REGEX = /.name\s+=\s+"\w+"/;
const PODSPEC_NAME_KEY_REGEX = /.name\s+=\s+"/;

/**
 * Helper that suggests absolute path to ios directory
 */
export const suggestIosDirectory = (workingDir: string): string | undefined => {
  const potentialIosDirectoryPath = path.resolve(workingDir, 'ios');

  if (!fs.existsSync(potentialIosDirectoryPath)) {
    return undefined;
  }

  return potentialIosDirectoryPath;
};

const findIosXcodeproj = (workingDir: string): string | undefined => {
  const [ xcodeprojFile ] = glob.sync('**/*.xcodeproj', {
    cwd: workingDir,
    ...IOS_GLOB_OPTIONS,
  });

  return xcodeprojFile;
};

const findLibraryPodspec = (workingDir: string): string | undefined => {
  const [ podspecFile ] = glob.sync('**/*.podspec', {
    // Podspec can be located in the parent directory for `ios` directory
    cwd: path.resolve(workingDir, '..'),
    ...IOS_GLOB_OPTIONS,
  });

  return podspecFile;
};

/**
 * Gets and parses iOS pbxproj file to JS object instance
 */
export const getIOSPbxProj = (projectPath: string) => {
  const potentialXcodeprojFilePath = findIosXcodeproj(projectPath);

  if (!potentialXcodeprojFilePath) {
    return { pbxproj: null, pbxprojPath: null };
  }

  const pbxprojPath = path.join(potentialXcodeprojFilePath, 'project.pbxproj');
  const pbxproj = xcode.project(pbxprojPath);

  pbxproj.parseSync();
  return { pbxproj, pbxprojPath };
};

/**
 * Saves changes applied to JS object instance of iOS pbxproj
 */
export const saveIOSPbxProj = (pbxproj: xcode.XcodeProject | null, pbxprojPath: string | null) => {
  if (!pbxproj || !pbxprojPath) {
    return;
  }

  fs.writeFileSync(pbxprojPath, pbxproj.writeSync());
};

const isFirstTargetAnApplication = (pbxproj: xcode.XcodeProject) => {
  return pbxproj.getFirstTarget().firstTarget.productType === '"com.apple.product-type.application"';
};

/**
 * Helper that returns a content for plugin's ObjC implementation
 */
const prepareObjCPluginImplementation = (pluginName: string, methodName: string) => {
  const objcPluginContent = `
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>

@interface ${pluginName}Plugin : FrameProcessorPlugin
@end

@implementation ${pluginName}Plugin

- (instancetype) initWithOptions:(NSDictionary*)options; {
  self = [super init];
  return self;
}

- (id)callback:(Frame*)frame withArguments:(NSDictionary*)arguments {
  CMSampleBufferRef buffer = frame.buffer;
  UIImageOrientation orientation = frame.orientation;
  // code goes here
  return nil;
}

+ (void)initialize {
  [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"${methodName}"
                                        withInitializer:^FrameProcessorPlugin*(NSDictionary* options) {
    return [[${pluginName}Plugin alloc] initWithOptions:options];
  }];
}

@end
`.trim();

  return objcPluginContent;
};

/**
 * Helper that returns a content for plugin's Swift implementation
 */
const prepareSwiftPluginImplementation = (
  pluginName: string,
  methodName: string,
  targetName: string,
): [string, string] => {
  const swiftPluginContent = `
import VisionCamera

@objc(${pluginName}Plugin)
public class ${pluginName}Plugin: FrameProcessorPlugin {
  @objc public init(withOptions options: [AnyHashable : Any]) {
    super.init()
  }

  @objc override public func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any {
    let buffer = frame.buffer
    let orientation = frame.orientation
    // code goes here
    return nil
  }
}
`.trim();

  const objcPluginContent = `
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("${targetName}/${targetName}-Swift.h")
#import "${targetName}/${targetName}-Swift.h"
#else
#import "${targetName}-Swift.h"
#endif

@interface ${pluginName}Plugin (FrameProcessorPluginLoader)
@end

@implementation ${pluginName}Plugin (FrameProcessorPluginLoader)

+ (void)initialize
{
  [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"${methodName}"
                                        withInitializer:^FrameProcessorPlugin*(NSDictionary* options) {
    return [[${pluginName}Plugin alloc] initWithOptions:options];
  }];
}

@end

`.trim();

  return [ swiftPluginContent, objcPluginContent ];
};

/**
 * Helper that creates a directory for plugin's code inside iOS directory 
 */
export const createIOSPluginDirectory = (projectPath: string, pluginName: string) => {
  const pluginDirectory = path.join(projectPath, pluginName);

  if (!fs.existsSync(pluginDirectory)) {
    fs.mkdirSync(pluginDirectory);
  }

  return pluginDirectory;
};

const createFileForIOSImplementation = (
  filepath: string,
  content: string,
) => {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content, { encoding: 'utf8' });
  }
};

/**
 * Helper that links Swift plugin directory and its source files to iOS pbxproj
 */
const linkSwiftImplementation = (
  pbxproj: XcodeProject,
  pluginName: string,
  objcImplFilename: string,
  swiftImplFilename: string,
) => {
  if (!pbxproj.pbxGroupByName(pluginName)) {
    const mainGroupKey = pbxproj.getFirstProject().firstProject.mainGroup;
    const firstTargetUuid = pbxproj.getFirstTarget().uuid;
    const pluginGroupKey = pbxproj.addPbxGroup([], pluginName, pluginName).uuid;

    pbxproj.addToPbxGroup(pluginGroupKey, mainGroupKey);
    pbxproj.addSourceFile(objcImplFilename, { target: firstTargetUuid }, pluginGroupKey);
    pbxproj.addSourceFile(swiftImplFilename, { target: firstTargetUuid }, pluginGroupKey);
  }
};

export const getFirstTargetNameFromPbxprojOrPodspec = (
  pbxproj: XcodeProject | null,
  projectPath: string,
): string | undefined => {
  // Application will have pbxproj, library may or may not have pbxproj
  if (pbxproj) {
    return pbxproj.getFirstTarget().firstTarget.name;
  }

  const podspecFilePath = findLibraryPodspec(projectPath);

  if (!podspecFilePath) {
    return undefined;
  }

  const podspecFileContent = fs.readFileSync(podspecFilePath, { encoding: 'utf-8' });
  const nameRowMatch = podspecFileContent.match(PODSPEC_NAME_REGEX);

  if (nameRowMatch?.[0] && nameRowMatch.index) {
    const nameRowStr = podspecFileContent.slice(nameRowMatch.index, nameRowMatch.index + nameRowMatch[0].length);
    const nameRowPrefixMatch = nameRowStr.match(PODSPEC_NAME_KEY_REGEX);

    if (nameRowPrefixMatch?.[0]) {
      // remove '.name     = "' & last '"'
      const nameValue = nameRowStr.slice(nameRowPrefixMatch[0].length, nameRowStr.length - 1);

      return nameValue;
    }
  }

  return undefined;
};

export const createSwiftPluginImplementation = (
  pbxproj: XcodeProject | null,
  projectPath: string,
  pluginDirectory: string,
  pluginName: string,
  methodName: string,
  spinner: Ora,
) => {
  const objcImplFilename = `${pluginName}.m`;
  const objcImplFilepath = path.join(pluginDirectory, objcImplFilename);
  const swiftImplFilename = `${pluginName}.swift`;
  const swiftImplFilepath = path.join(pluginDirectory, swiftImplFilename);
  
  spinner.text = 'Getting first target name';
  spinner.start();

  const firstTargetName = getFirstTargetNameFromPbxprojOrPodspec(pbxproj, projectPath);

  if (!firstTargetName) {
    spinner.fail();
    console.error(kleur.red('Could not determine name for application/library first target. Make sure your application has valid Xcodeproj file or your library has valid podspec with `name` attribute'));
    return;
  }

  spinner.succeed();

  const [ swiftImplContent, objcImplContent ] = prepareSwiftPluginImplementation(
    pluginName,
    methodName,
    firstTargetName,
  );

  spinner.text = `Generating ${objcImplFilename}`;
  spinner.start();

  createFileForIOSImplementation(objcImplFilepath, objcImplContent);

  spinner.succeed();

  spinner.text = `Generating ${swiftImplFilename}`;
  spinner.start();

  createFileForIOSImplementation(swiftImplFilepath, swiftImplContent);

  spinner.succeed();

  spinner.text = `Linking ${objcImplFilename} & ${swiftImplFilename}`;
  spinner.start();

  if (pbxproj) {
    linkSwiftImplementation(pbxproj, pluginName, objcImplFilename, swiftImplFilename);
  }

  spinner.succeed();
};

/**
 * Helper that links ObjC plugin directory and its source files to iOS pbxproj
 */
const linkObjCImplementation = (
  pbxproj: XcodeProject,
  pluginName: string,
  objcImplFilename: string,
) => {
  if (!pbxproj.pbxGroupByName(pluginName)) {
    const mainGroupKey = pbxproj.getFirstProject().firstProject.mainGroup;
    const firstTargetUuid = pbxproj.getFirstTarget().uuid;
    const pluginGroupKey = pbxproj.addPbxGroup([], pluginName, pluginName).uuid;

    pbxproj.addToPbxGroup(pluginGroupKey, mainGroupKey);
    pbxproj.addSourceFile(objcImplFilename, { target: firstTargetUuid }, pluginGroupKey);  
  }
};

export const createObjCPluginImplementation = (
  pbxproj: XcodeProject | null,
  pluginDirectory: string,
  pluginName: string,
  methodName: string,
  lang: 'ObjC' | 'ObjCPP',
  spinner: Ora,
) => {
  const objcImplFilename = `${pluginName}.${lang === 'ObjCPP' ? 'mm' : 'm'}`;
  const objcImplFilepath = path.join(pluginDirectory, objcImplFilename);
  const objcImplContent = prepareObjCPluginImplementation(pluginName, methodName);

  spinner.text = `Generating ${objcImplFilename}`;
  spinner.start();

  createFileForIOSImplementation(objcImplFilepath, objcImplContent);

  spinner.succeed();

  spinner.text = `Linking ${objcImplFilename}`;
  spinner.start();

  if (pbxproj) {
    linkObjCImplementation(pbxproj, pluginName, objcImplFilename);
  }

  spinner.succeed();
};

export const printFinishStepsForIOS = (pbxproj: XcodeProject | null) => {
  if (!pbxproj || !isFirstTargetAnApplication(pbxproj)) {
    console.log(kleur.gray(`${kleur.yellow(`Finish setup for your iOS library with adding "VisionCamera" spec dependency
in your library's ".podspec" file:`)}
# YourAwesomePluginLibrary.podspec
require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "YourAwesomePluginLibrary"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.4" }
  s.source       = { :git => "https://github.com/awesomeuser/vision-camera-awesome-plugin.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  ${kleur.green('s.dependency "VisionCamera" # add this')}
end`.trim()));
    console.log('\n');
  }
};
