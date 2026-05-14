require 'webrick'
port = (ENV['PORT'] || 8899).to_i
server = WEBrick::HTTPServer.new(
  Port: port,
  DocumentRoot: '/Users/imoto/Documents/GitHub/roteiro-facil',
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::ERROR),
  AccessLog: []
)
trap('INT') { server.stop }
server.start
