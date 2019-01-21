import * as program from 'commander'
import * as dotenv from 'dotenv'
import ip = require('ip')

dotenv.config()

import SignallingServer from './src/server'
import MediaServer from './media/server'

const media = new MediaServer({
    endpoint: '127.0.0.1'
})

const signalling = new SignallingServer()

signalling.start(3888, '0.0.0.0', () => {
    console.log('signalling server start on', 3888)
})

media.start(6000, '0.0.0.0', () => {
    console.log('media server start on', 6000)
})











