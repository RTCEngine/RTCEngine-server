
import * as http from 'http'
import * as program from 'commander'
import * as dotenv from 'dotenv'

const MediaServer = require('medooze-media-server')

dotenv.config()

import Application from './src/application'

Application.bootstrap()

MediaServer.enableLog(false)
MediaServer.enableDebug(false)
MediaServer.enableUltraDebug(false)

//todo add some cli 
