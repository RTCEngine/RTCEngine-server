
import * as http from 'http'
import * as program from 'commander'
import * as dotenv from 'dotenv'
import ip  = require('ip')

const MediaServer = require('medooze-media-server')

dotenv.config()

import Server from './src/server'
import config from './src/config'

MediaServer.enableDebug(true);
MediaServer.enableUltraDebug(true);

//Restrict port range
MediaServer.setPortRange(10000,10002);

if (process.env.DEV) {
    //config.server.host = ip.address()
    // console.log('listen on ', config.server.host,config.server.port)
}

const server = new Server()




