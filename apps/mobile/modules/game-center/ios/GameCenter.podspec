Pod::Spec.new do |s|
  s.name           = 'GameCenter'
  s.version        = '1.0.0'
  s.summary        = 'Game Center integration for Ponggers'
  s.description    = 'An app-local Expo module for Game Center authentication and achievements.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'GameKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
