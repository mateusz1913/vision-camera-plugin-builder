import { vol } from 'memfs';
import type xcode from 'xcode';

import { getFirstTargetNameFromPbxprojOrPodspec } from '../src/ios-utils';

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

beforeEach(() => {
  vol.fromJSON({
    'SamplePlugin.podspec': PODSPEC_FILE,
  }, PROJECT_FILE_PATH);
});

afterEach(() => {
  vol.reset();
});

describe('getFirstTargetNameFromPbxprojOrPodspec', () => {
  test('should retrieve first target name from XcodeProject instance', () => {
    expect(getFirstTargetNameFromPbxprojOrPodspec(
      {
        getFirstTarget: () => ({
          firstTarget: {
            name: FIRST_TARGET_NAME,
          },
        }),
      } as unknown as xcode.XcodeProject,
      PROJECT_FILE_PATH,
    )).toBe(FIRST_TARGET_NAME);
  });
  test('should retrieve first target name from podspec file', () => {
    expect(getFirstTargetNameFromPbxprojOrPodspec(
      null,
      PROJECT_FILE_PATH,
    )).toBe(FIRST_TARGET_NAME);
  });
});
