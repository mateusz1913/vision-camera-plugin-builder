interface pbxFile {
  basename: string;
  lastKnownFileType?: string;
  group?: string;
  path?: string;
  fileEncoding?: number;
  defaultEncoding?: number;
  sourceTree: string;
  includeInIndex?: number;
  explicitFileType?: unknown;
  settings?: object;
  uuid?: string;
  fileRef: string;
  target?: string;
}

declare module 'xcode' {
  interface PBXGroup {
    isa: 'PBXGroup';
    children: {
      value: UUID;
      comment?: string;
    }[];
    name: string;
    path?: string;
    sourceTree: '"<group>"' | unknown;
  }

  interface PBXNativeTarget {
    isa: 'PBXNativeTarget';
    buildConfigurationList: UUID;
    buildConfigurationList_comment: string;
    buildPhases: {
      value: UUID;
      comment: string;
    }[];
    buildRules: [];
    dependencies: {
      value: UUID;
      comment: string;
    }[];
    name: string;
    productName: string;
    productReference: UUID;
    productReference_comment: string;
    productType: string;
  }

  interface PBXProject {
    isa: 'PBXProject';
    attributes: {
      LastUpgradeCheck: number;
      TargetAttributes: Record<
        string,
        {
          CreatedOnToolsVersion?: string;
          TestTargetID?: string;
          LastSwiftMigration?: number;
          ProvisioningStyle?: string;
        } & Record<string, string | number | undefined>
      >;
    };
    buildConfigurationList: string;
    buildConfigurationList_comment: string;
    compatibilityVersion: string;
    developmentRegion: string;
    hasScannedForEncodings: number;
    knownRegions: string[];
    mainGroup: string;
    productRefGroup: string;
    productRefGroup_comment: string;
    projectDirPath: string;
    projectRoot: string;
    targets: {
      value: string;
      comment: string;
    }[];
  }

  export class XcodeProject {
    constructor(pbxprojPath: string);

    productName: string;

    addFile(
      path: string,
      group?: string,
      opt?: {
        plugin?: string;
        target?: string;
        variantGroup?: string;
        lastKnownFileType?: string;
        defaultEncoding?: number;
        customFramework?: boolean;
        explicitFileType?: number;
        weak?: boolean;
        compilerFlags?: string;
        embed?: boolean;
        sign?: boolean;
      },
    ): pbxFile | null;
    addSourceFile(
      path: string,
      opt?: {
        plugin?: string;
        target?: string;
        variantGroup?: string;
        lastKnownFileType?: string;
        defaultEncoding?: number;
        customFramework?: boolean;
        explicitFileType?: number;
        weak?: boolean;
        compilerFlags?: string;
        embed?: boolean;
        sign?: boolean;
      },
      group?: string,
    ): pbxFile | null;
    addPbxGroup(
      filePathsArray: string[],
      name: string,
      path?: string,
      sourceTree?: string,
    ): { uuid: string; pbxGroup: PBXGroup };
    addToPbxGroup(fileOrChildGroupKey: pbxFile | string, groupKey: string): void;
    addToPbxSourcesBuildPhase(file: pbxFile): void
    findPBXGroupKey(criteria: { name?: string; path?: string }): string | undefined
    getBuildProperty(prop: string, build?: string, targetName?: string): string | undefined;
    getFirstProject(): { uuid: string; firstProject: PBXProject };
    getFirstTarget(): { uuid: string; firstTarget: PBXNativeTarget };
    getPBXGroupByKey(groupKey: string): PBXGroup | undefined;
    parseSync(): void;
    pbxGroupByName(name: string): PBXGroup | undefined;
    updateBuildProperty(prop: string, value: string, build?: string, targetName?: string): void;
    writeSync(options?: { omitEmptyValues?: boolean }): string;
  }

  export function project(projectPath: string): XcodeProject;
}
