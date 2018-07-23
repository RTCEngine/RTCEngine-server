
import * as http from 'http'
import * as program from 'commander'
import * as dotenv from 'dotenv'

const MediaServer = require('medooze-media-server')

dotenv.config()

import Server from './src/server'
import config from './src/config'

const server = new Server()

MediaServer.enableLog(false)
MediaServer.enableDebug(false)
MediaServer.enableUltraDebug(false)
MediaServer.setPortRange(config.media.rtcMinPort, config.media.rtcMaxPort)




