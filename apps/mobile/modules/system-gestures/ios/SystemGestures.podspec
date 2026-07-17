Pod::Spec.new do |s|
  s.name           = 'SystemGestures'
  s.version        = '1.0.0'
  s.summary        = 'Controls iOS system gesture deferral during gameplay'
  s.description    = 'An app-local Expo module that defers top and bottom iOS system gestures while a game is active.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
