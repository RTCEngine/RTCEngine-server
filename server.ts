import * as program from 'commander'
import * as dotenv from 'dotenv'
import ip = require('ip')

const MediaServer = require('medooze-media-server')

dotenv.config()

import Server from './src/server'

// MediaServer.enableDebug(true);
// MediaServer.enableUltraDebug(true);



const server = new Server({})

server.start(3888, '0.0.0.0', () => {

    console.log('start =========================')
})




