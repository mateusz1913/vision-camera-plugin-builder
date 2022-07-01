require 'xcodeproj'

### ARGUMENTS
if ARGV.length < 3
  puts "Project path and plugin name and method name not provided"
  exit
end

# ruby generateIOS.rb <path-to-xcodeproj> <pluginName> <methodName>

project_path = ARGV[0] # <path-to-xcodeproj>
plugin_name = ARGV[1] # <pluginName>
method_name = ARGV[2] # <methodName>
lang = ARGV[3] # Swift || ObjC || ObjCPP
if lang == nil
  lang = "Swift"
end

# Project reference
project = Xcodeproj::Project.open(project_path)
group = project.main_group

# Creating bridging header (if needed)
if lang == "Swift"
  bridging_headers = [
    "#import <VisionCamera/FrameProcessorPlugin.h>",
    "#import <VisionCamera/Frame.h>"
  ].join("\n")
  default_bridging_header_filename = "#{project.root_object.name}-Bridging-Header.h"
  default_bridging_header_path = File.join(project.project_dir, default_bridging_header_filename)
  is_bridging_header_created = false
  project.targets.each do |target|
    # Skip if target type is unit tests or app extension, etc.
    next if target.product_type != "com.apple.product-type.application"

    target.build_configurations.each do |config|
      if config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] == nil
        # Create default bridging header if needed and link it to build settings
        if File.exist?(default_bridging_header_path) == false
          bridging_header_file = File.new(default_bridging_header_path, 'w+')
          File.write(default_bridging_header_path, bridging_headers, mode: 'a')
          bridging_header_file.close
          is_bridging_header_created = true
          puts "Created #{default_bridging_header_filename}"
        end

        config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = default_bridging_header_filename
      end
    end

    # Link bridging header file to xcode if needed
    if is_bridging_header_created == true
      destination_group = group[project.root_object.name]
      if destination_group == nil
        destination_group = group
      end
      default_bridging_header_ref = destination_group.find_file_by_path(default_bridging_header_filename)
      if default_bridging_header_ref == nil
        default_bridging_header_ref = destination_group.new_file(default_bridging_header_path)
      end
      target.add_file_references([default_bridging_header_ref])
    else
      puts """
      Make sure to add following lines to your bridging header file:

      #{bridging_headers}
      """
    end

  end
end

# Creating plugin group
plugin_dir_path = File.join(project.project_dir, plugin_name)
if Dir.exist?(plugin_dir_path) == false
  Dir.mkdir(plugin_dir_path)
end
plugin_group_ref = group[plugin_name]
if plugin_group_ref == nil
  plugin_group_ref = group.new_group(plugin_name)
end

# Create plugin files and link to xcode
if lang == "Swift"
  objc_impl_filename = "#{plugin_name}.m"
  objc_impl_file_path = File.join(plugin_dir_path, objc_impl_filename)
  if File.exist?(objc_impl_file_path) == false
    objc_impl_file = File.new(objc_impl_file_path, 'w+')
    File.write(objc_impl_file_path, [
      "#import <VisionCamera/FrameProcessorPlugin.h>",
      "",
      "@interface VISION_EXPORT_SWIFT_FRAME_PROCESSOR(#{method_name}, #{plugin_name}Plugin)",
      "@end"
    ].join("\n"), mode: 'a')
    objc_impl_file.close
    puts "Created #{objc_impl_filename}"
  end

  swift_filename = "#{plugin_name}.swift"
  swift_file_path = File.join(plugin_dir_path, swift_filename)
  if File.exist?(swift_file_path) == false
    swift_file = File.new(swift_file_path, 'w+')
    File.write(swift_file_path, [
      "@objc(#{plugin_name}Plugin)",
      "public class #{plugin_name}Plugin: NSObject, FrameProcessorPluginBase {",
      "  @objc public static func callback(_ frame: Frame!, withArgs _: [Any]!) -> Any! {",
      "    let buffer = frame.buffer",
      "    let orientation = frame.orientation",
      "    // code goes here",
      "    return []",
      "  }",
      "}"
    ].join("\n"), mode: 'a')
    swift_file.close
    puts "Created #{swift_filename}"
  end

  objc_impl_relative_path = File.join("#{plugin_group_ref.name}", "#{objc_impl_filename}")
  objc_impl_file_ref = plugin_group_ref.find_file_by_path(objc_impl_relative_path)
  if objc_impl_file_ref == nil
    objc_impl_file_ref = plugin_group_ref.new_file(objc_impl_file_path)
  end
  swift_impl_relative_path = File.join("#{plugin_group_ref.name}", "#{swift_filename}")
  swift_file_ref = plugin_group_ref.find_file_by_path(swift_impl_relative_path)
  if swift_file_ref == nil
    swift_file_ref = plugin_group_ref.new_file(swift_file_path)
  end

  project.targets.each do |target|
    # Skip if target type is unit tests or app extension, etc.
    next if target.product_type != "com.apple.product-type.application" || target.product_type != "com.apple.product-type.library.static"
    target.add_file_references([objc_impl_file_ref, swift_file_ref])
  end
else
  objc_impl_file_ext = ".m"
  if lang == "ObjCPP"
    objc_impl_file_ext = ".mm"
  end

  objc_impl_filename = "#{plugin_name}#{objc_impl_file_ext}"
  objc_impl_file_path = File.join(plugin_dir_path, objc_impl_filename)
  if File.exist?(objc_impl_file_path) == false
    objc_impl_file = File.new(objc_impl_file_path, 'w+')
    File.write(objc_impl_file_path, [
      "#import <VisionCamera/FrameProcessorPlugin.h>",
      "#import <VisionCamera/Frame.h>",
      "",
      "@interface #{plugin_name}Plugin : NSObject",
      "@end",
      "",
      "@implementation #{plugin_name}Plugin",
      "",
      "static inline id #{method_name}(Frame* frame, NSArray* args) {",
      "  CMSampleBufferRef buffer = frame.buffer;",
      "  UIImageOrientation orientation = frame.orientation;",
      "  // code goes here",
      "  return @[];",
      "}",
      "",
      "VISION_EXPORT_FRAME_PROCESSOR(#{method_name})",
      "",
      "@end"
    ].join("\n"), mode: 'a')
    objc_impl_file.close
    puts "Created #{objc_impl_filename}"
  end

  objc_impl_relative_path = File.join("#{plugin_group_ref.name}", "#{objc_impl_filename}")
  objc_impl_file_ref = plugin_group_ref.find_file_by_path(objc_impl_relative_path)
  if objc_impl_file_ref == nil
    objc_impl_file_ref = plugin_group_ref.new_file(objc_impl_file_path)
  end

  project.targets.each do |target|
    # Skip if target type is unit tests or app extension, etc.
    next if target.product_type != "com.apple.product-type.application" || target.product_type != "com.apple.product-type.library.static"
    target.add_file_references([objc_impl_file_ref])
  end
end

# Save xcodeproj changes
project.save
