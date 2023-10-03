import fs from 'fs';
import path from 'path';

import glob from 'glob';
import kleur from 'kleur';
import type { Ora } from 'ora';
import type { XcodeProject } from 'xcode';
import xcode from 'xcode';

/**
 * Helper that suggests absolute path to iOS xcodeproj file
 */
export const suggestIosXcodeproj = (workingDir: string): string | undefined => {
  const [ xcodeprojFile ] = glob.sync('**/*.xcodeproj', {
    cwd: workingDir,
    absolute: true,
    ignore: [ '**/@(Carthage|Pods|vendor|node_modules)/**' ],
    nocase: true,
    nodir: false,
  });

  return xcodeprojFile;
};

/**
 * Gets and parses iOS pbxproj file to JS object instance
 */
export const getIOSPbxProj = (projectPath: string) => {
  const pbxprojPath = path.join(projectPath, 'project.pbxproj');
  const pbxproj = xcode.project(pbxprojPath);

  pbxproj.parseSync();
  return { pbxproj, pbxprojPath };
};

/**
 * Saves changes applied to JS object instance of iOS pbxproj
 */
export const saveIOSPbxProj = (pbxproj: xcode.XcodeProject, pbxprojPath: string) => {
  fs.writeFileSync(pbxprojPath, pbxproj.writeSync());
};

/**
 * Helper that returns if first target is an application target
 */
export const isFirstTargetAnApplication = (pbxproj: xcode.XcodeProject) => {
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

+ (void) initialize {
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

+ (void)load
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
  const iosProjectDirectory = path.dirname(projectPath);
  const pluginDirectory = path.join(iosProjectDirectory, pluginName);

  if (!fs.existsSync(pluginDirectory)) {
    fs.mkdirSync(pluginDirectory);
  }

  return pluginDirectory;
};

const createObjCImplFileForSwiftImplementation = (
  objcImplFilepath: string,
  objcImplContent: string,
) => {
  if (!fs.existsSync(objcImplFilepath)) {
    fs.writeFileSync(objcImplFilepath, objcImplContent, { encoding: 'utf8' });
  }
};

const createSwiftImplFileForSwiftImplementation = (
  swiftImplFilepath: string,
  swiftImplContent: string,
) => {
  if (!fs.existsSync(swiftImplFilepath)) {
    fs.writeFileSync(swiftImplFilepath, swiftImplContent, { encoding: 'utf8' });
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

export const createSwiftPluginImplementation = (
  pbxproj: XcodeProject,
  pluginDirectory: string,
  pluginName: string,
  methodName: string,
  spinner: Ora,
) => {
  const objcImplFilename = `${pluginName}.m`;
  const objcImplFilepath = path.join(pluginDirectory, objcImplFilename);
  const swiftImplFilename = `${pluginName}.swift`;
  const swiftImplFilepath = path.join(pluginDirectory, swiftImplFilename);
  const firstTargetName = pbxproj.getFirstTarget().firstTarget.name;
  const [ swiftImplContent, objcImplContent ] = prepareSwiftPluginImplementation(
    pluginName,
    methodName,
    firstTargetName,
  );

  spinner.text = `Generating ${objcImplFilename}`;
  spinner.start();

  createObjCImplFileForSwiftImplementation(objcImplFilepath, objcImplContent);

  spinner.succeed();

  spinner.text = `Generating ${swiftImplFilename}`;
  spinner.start();

  createSwiftImplFileForSwiftImplementation(swiftImplFilepath, swiftImplContent);

  spinner.succeed();

  spinner.text = `Linking ${objcImplFilename} & ${swiftImplFilename}`;
  spinner.start();

  linkSwiftImplementation(pbxproj, pluginName, objcImplFilename, swiftImplFilename);

  spinner.succeed();
};

const createObjCImplFileForObjCImplementation = (
  objcImplFilepath: string,
  objcImplContent: string,
) => {
  if (!fs.existsSync(objcImplFilepath)) {
    fs.writeFileSync(objcImplFilepath, objcImplContent, { encoding: 'utf8' });
  }
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
  pbxproj: XcodeProject,
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

  createObjCImplFileForObjCImplementation(objcImplFilepath, objcImplContent);

  spinner.succeed();

  spinner.text = `Linking ${objcImplFilename}`;
  spinner.start();

  linkObjCImplementation(pbxproj, pluginName, objcImplFilename);

  spinner.succeed();
};

export const displayFinishStepsForIOSLibraryPlugin = () => {
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
};
