import * as program from 'commander'
import * as dotenv from 'dotenv'


dotenv.config()

import SignallingServer from './control/server'
import MediaServer from './media/server'

const media01 = new MediaServer({
    endpoint: '127.0.0.1'
})

const media02 = new MediaServer({
    endpoint: '127.0.0.1'
})


const signalling = new SignallingServer()

signalling.start(3888, '0.0.0.0', () => {
    
    console.log('signalling server start on', 3888)
})

media01.start(6001, '0.0.0.0', () => {

    console.log('media server start on', 6000)
})


media02.start(6002, '0.0.0.0', () => {

    console.log('media server start on', 6001)
})











